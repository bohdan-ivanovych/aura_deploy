/**
 * video-processor.ts
 *
 * Unified short-video context extractor for:
 *   - TikTok      (via TikWM API + Whisper)
 *   - YouTube Shorts (via yt-dlp-compatible endpoint + Whisper)
 *   - Instagram Reels (via Reels-compatible endpoint + Whisper)
 *
 * Architecture:
 *   1. Each platform has a lightweight `PlatformAdapter` that fetches
 *      metadata + a streamable video/audio URL.
 *   2. The shared `processShortVideo()` pipeline runs Whisper on the
 *      download URL, then falls back to Vision API on the cover image.
 *   3. The legacy `processTikTokMultimodal()` re-export keeps all
 *      existing callers working with zero changes.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getGroqClient } from '@/lib/ai/groq';
import { YoutubeTranscript } from 'youtube-transcript';
import YTDlpWrap from 'yt-dlp-wrap';

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});


const ytDlp = new YTDlpWrap();

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type ShortVideoPlatform = 'tiktok' | 'shorts' | 'reels';

export interface ShortVideoContext {
  platform: ShortVideoPlatform;
  title: string | null;
  authorName: string | null;
  transcription: string | null;
  visionAnalysis: string | null;
  thumbnailUrl: string | null;
  error?: string;
}

/** @deprecated Use ShortVideoContext directly */
export type FullTikTokContext = ShortVideoContext;

interface PlatformMeta {
  title: string | null;
  authorName: string | null;
  playUrl: string | null;       // streamable video/audio URL for Whisper
  coverUrl: string | null;      // thumbnail/cover for Vision fallback
  fileSizeBytes?: number | null; // optional pre-check to skip huge files
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15 MB
const MEDIA_DOWNLOAD_TIMEOUT_MS = 12_000;

// ─── Platform Adapters ────────────────────────────────────────────────────────

/**
 * TikTok — uses yt-dlp-wrap.
 */
async function fetchTikTokMeta(url: string): Promise<PlatformMeta> {
  try {
    const info = await ytDlp.getVideoInfo(url);
    // Prefer best audio format if available, otherwise fallback to general url
    const bestAudio = info.formats?.filter((f: any) => f.acodec !== 'none')?.sort((a: any, b: any) => (b.tbr || 0) - (a.tbr || 0))[0];

    return {
      title: info.title || info.description || null,
      authorName: info.uploader || info.creator || null,
      playUrl: bestAudio?.url || info.url || null,
      coverUrl: info.thumbnail || null,
      fileSizeBytes: null, // Let the pipeline check size later
    };
  } catch (err) {
    console.warn('[VideoProcessor:tiktok] yt-dlp failed:', err);
    return { title: null, authorName: null, playUrl: null, coverUrl: null };
  }
}

/**
 * YouTube Shorts — uses youtube-transcript for direct text extraction.
 */
async function fetchShortsMeta(url: string, fallbackTitle: string | null): Promise<PlatformMeta> {
  // Try youtube-transcript directly for fast text extraction (no Whisper needed!)
  // This will skip the playUrl audio extraction and rely on YouTube's captions.
  return {
    title: fallbackTitle,
    authorName: null,
    playUrl: null, // we won't need audio download for whisper
    coverUrl: null,
  };
}

/**
 * Instagram Reels — uses yt-dlp-wrap.
 */
async function fetchReelsMeta(url: string, fallbackTitle: string | null): Promise<PlatformMeta> {
  try {
    const info = await ytDlp.getVideoInfo(url);
    const bestAudio = info.formats?.filter((f: any) => f.acodec !== 'none')?.sort((a: any, b: any) => (b.tbr || 0) - (a.tbr || 0))[0];

    return {
      title: info.title || info.description || fallbackTitle,
      authorName: info.uploader || info.creator || null,
      playUrl: bestAudio?.url || info.url || null,
      coverUrl: info.thumbnail || null,
      fileSizeBytes: null,
    };
  } catch (err) {
    console.warn('[VideoProcessor:reels] yt-dlp failed:', err);
    return { title: fallbackTitle, authorName: null, playUrl: null, coverUrl: null };
  }
}

// ─── Shared Whisper + Vision Pipeline ─────────────────────────────────────────

async function runTranscriptionPipeline(
  meta: PlatformMeta,
  result: ShortVideoContext,
): Promise<void> {
  let gotAudio = false;

  // ── Step 1: Whisper transcription ──────────────────────────────────────────
  if (meta.playUrl && (!meta.fileSizeBytes || meta.fileSizeBytes <= MAX_VIDEO_SIZE)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MEDIA_DOWNLOAD_TIMEOUT_MS);

      const videoRes = await fetch(meta.playUrl, { signal: controller.signal });
      if (!videoRes.ok) throw new Error('Video fetch failed');

      const arrayBuffer = await videoRes.arrayBuffer();
      clearTimeout(timeout);

      if (arrayBuffer.byteLength > 0 && arrayBuffer.byteLength <= MAX_VIDEO_SIZE) {
        const groqFile = new File([arrayBuffer], 'video.mp4', { type: 'video/mp4' });
        const groq = getGroqClient();

        const transcription = await groq.audio.transcriptions.create({
          file: groqFile,
          model: 'whisper-large-v3-turbo',
          response_format: 'json',
          temperature: 0.0,
        });

        if (transcription.text?.trim().length > 0) {
          result.transcription = transcription.text.trim();
          gotAudio = true;
          console.log(
            `[VideoProcessor:${result.platform}] Whisper Transcription Extracted (${transcription.text.length} chars)`,
          );
        } else {
          console.log(`[VideoProcessor:${result.platform}] Whisper returned empty text.`);
        }
      }
    } catch (err) {
      console.warn(`[VideoProcessor:${result.platform}] Whisper failed:`, err);
    }
  }

  // ── Step 2: Vision analysis on cover image (always attempted if available) ───
  // Gemini can accept image URLs directly — no need to download the buffer.
  if (meta.coverUrl) {
    try {
      const coverUrl = meta.coverUrl;
      console.log(`[VideoProcessor:${result.platform}] Running Vision API on thumbnail...`);

      const { text } = await generateText({
        model: googleProvider('gemini-1.5-flash'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are an AI analyzing a short-form video thumbnail/cover image. Describe exactly what is happening in the scene, any people visible, their expressions and emotions, any objects, the setting, and carefully extract ANY text visible on screen (OCR). Keep it concise but highly descriptive. Max 3 sentences.',
              },
              { type: 'image', image: new URL(coverUrl) },
            ],
          },
        ],
        temperature: 0.4,
      });

      if (text?.trim()) {
        result.visionAnalysis = text.trim();
        console.log(
          `[VideoProcessor:${result.platform}] Vision analysis extracted (${text.length} chars)`,
        );
      }
    } catch (err) {
      console.warn(`[VideoProcessor:${result.platform}] Vision failed:`, err);
    }
  }

  // Warn if we ended up with no useful content for the LLM
  if (!result.transcription && !result.visionAnalysis) {
    console.warn(
      `[VideoProcessor:${result.platform}] WARNING: No transcription or vision analysis available. LLM will have no video content to react to.`,
    );
  }
}

// ─── Public Entry Point ───────────────────────────────────────────────────────

/**
 * processShortVideo — universal short-video context extractor.
 *
 * @param platform  'tiktok' | 'shorts' | 'reels'
 * @param url       Clean URL (no query string) to the video
 * @param fallbackTitle  Optional title from oEmbed / page meta
 */
export async function processShortVideo(
  platform: ShortVideoPlatform,
  url: string,
  fallbackTitle: string | null = null,
  externalCoverUrl: string | null = null, // oEmbed / page-level thumbnail
): Promise<ShortVideoContext> {
  const result: ShortVideoContext = {
    platform,
    title: fallbackTitle,
    authorName: null,
    transcription: null,
    visionAnalysis: null,
    thumbnailUrl: null,
  };

  try {
    const cleanUrl = url.trim().split('?')[0];

    let meta: PlatformMeta;

    if (platform === 'tiktok') {
      meta = await fetchTikTokMeta(cleanUrl);
    } else if (platform === 'shorts') {
      meta = await fetchShortsMeta(cleanUrl, fallbackTitle);
    } else {
      meta = await fetchReelsMeta(cleanUrl, fallbackTitle);
    }

    result.title = meta.title || fallbackTitle;
    result.authorName = meta.authorName;
    // Prefer platform-provided thumbnail, fall back to caller-supplied oEmbed one
    result.thumbnailUrl = meta.coverUrl || externalCoverUrl;
    // Ensure Vision pipeline has a cover to work with
    if (!meta.coverUrl && externalCoverUrl) meta.coverUrl = externalCoverUrl;

    console.log(`[VideoProcessor:${platform}] Fetched metadata → Title: "${result.title}", Author: "${result.authorName}"`);

    if (platform === 'shorts') {
      try {
        let videoId = cleanUrl;
        if (cleanUrl.includes('/shorts/')) {
          videoId = cleanUrl.split('/shorts/')[1].split('?')[0];
        } else if (cleanUrl.includes('v=')) {
          videoId = new URL(cleanUrl).searchParams.get('v') || cleanUrl;
        } else if (cleanUrl.includes('youtu.be/')) {
          videoId = cleanUrl.split('youtu.be/')[1].split('?')[0];
        }
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        if (transcriptItems && transcriptItems.length > 0) {
          result.transcription = transcriptItems.map((item: any) => item.text).join(' ');
          console.log(`[VideoProcessor:shorts] youtube-transcript extracted (${result.transcription.length} chars)`);
        }
      } catch (err) {
        console.warn(`[VideoProcessor:shorts] youtube-transcript failed:`, err);
      }
    }

    await runTranscriptionPipeline(meta, result);
  } catch (err) {
    console.warn(`[VideoProcessor:${platform}] Flow failed, returning basic metadata:`, err);
    result.error = 'Multimodal fetch degraded gracefully.';
  }

  return result;
}

// ─── Backwards-compat re-export ───────────────────────────────────────────────

/**
 * @deprecated Use processShortVideo('tiktok', url, oEmbedTitle) instead.
 * Kept for zero-change compatibility with existing callers.
 */
export async function processTikTokMultimodal(
  url: string,
  oEmbedTitle: string | null,
): Promise<FullTikTokContext> {
  return processShortVideo('tiktok', url, oEmbedTitle);
}
