/**
 * video-processor.ts
 *
 * Unified short-video context extractor for:
 *   - TikTok      (via TikWM API + Whisper)
 *   - YouTube Shorts (via youtube-transcript or Whisper)
 *   - Instagram Reels (via Cobalt API + Whisper)
 *
 * Architecture:
 *   1. Each platform has a lightweight `PlatformAdapter` that fetches
 *      metadata + a streamable video/audio URL.
 *   2. The shared `processShortVideo()` pipeline runs Whisper on the
 *      download URL, then falls back to Vision API on the cover image.
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
  /** True when no video content could be extracted — LLM should ask user to describe the video */
  hasNoContext?: boolean;
  error?: string;
}

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
const METADATA_TIMEOUT_MS = 4_000;
const TRANSCRIPTION_TIMEOUT_MS = 12_000;
const VISION_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

// ─── Platform Adapters ────────────────────────────────────────────────────────

/**
 * FIX: Cobalt API updated to v2 format.
 * Old endpoint: POST https://api.cobalt.tools/api/json
 * New endpoint: POST https://api.cobalt.tools/ with Accept: application/json
 */
async function fetchMetaViaCobalt(url: string): Promise<PlatformMeta | null> {
  try {
    console.log('[VideoProcessor:Cobalt] Querying cobalt API for:', url);
    const res = await withTimeout(
      fetch('https://api.cobalt.tools/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url,
          downloadMode: 'audio',
          audioFormat: 'mp3',
        }),
      }),
      METADATA_TIMEOUT_MS,
      'Cobalt API',
    );

    if (res.ok) {
      const data = await res.json();
      // Cobalt v2 response: { status: 'tunnel'|'redirect'|'picker', url?, filename? }
      const downloadUrl = data.url ?? data.audio ?? null;
      if (downloadUrl) {
        console.log('[VideoProcessor:Cobalt] Successfully got download url');
        return {
          title: data.filename ?? null,
          authorName: null,
          playUrl: downloadUrl,
          coverUrl: null,
          fileSizeBytes: null,
        };
      }
      // picker response — take the first audio item
      if (data.status === 'picker' && Array.isArray(data.picker) && data.picker.length > 0) {
        const firstAudio = data.picker.find((p: any) => p.type === 'audio') ?? data.picker[0];
        if (firstAudio?.url) {
          return {
            title: data.filename ?? null,
            authorName: null,
            playUrl: firstAudio.url,
            coverUrl: firstAudio.thumb ?? null,
            fileSizeBytes: null,
          };
        }
      }
    } else {
      console.warn('[VideoProcessor:Cobalt] status not ok:', res.status);
    }
  } catch (e) {
    console.warn('[VideoProcessor:Cobalt] error:', e);
  }
  return null;
}

/** Helper: check if yt-dlp is available in PATH */
function isYtDlpEnvError(err: unknown): boolean {
  return (
    (err as any)?.code === 'ENOENT' ||
    String(err).includes('ENOENT') ||
    String(err).includes('spawn')
  );
}

/**
 * TikTok — uses TikWM API → Cobalt → yt-dlp fallback.
 */
async function fetchTikTokMeta(url: string): Promise<PlatformMeta> {
  // 1. TikWM
  try {
    const res = await withTimeout(
      fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`),
      METADATA_TIMEOUT_MS,
      'TikWM API',
    );
    if (res.ok) {
      const data = await res.json();
      if (data.code === 0 && data.data) {
        return {
          title: data.data.title ?? null,
          authorName: data.data.author?.unique_id ?? data.data.author?.nickname ?? null,
          playUrl: data.data.play ?? data.data.wmplay ?? null,
          coverUrl: data.data.cover ?? null,
          fileSizeBytes: data.data.size ?? null,
        };
      }
    }
  } catch (err) {
    console.warn('[VideoProcessor:tiktok] TikWM failed:', err);
  }

  // 2. Cobalt
  const cobaltMeta = await fetchMetaViaCobalt(url);
  if (cobaltMeta?.playUrl) return cobaltMeta;

  // 3. yt-dlp — FIX: handle ENOENT gracefully (same as Reels)
  try {
    const info = await withTimeout(ytDlp.getVideoInfo(url), METADATA_TIMEOUT_MS, 'TikTok yt-dlp');
    const bestAudio = info.formats
      ?.filter((f: any) => f.acodec !== 'none')
      ?.sort((a: any, b: any) => (b.tbr ?? 0) - (a.tbr ?? 0))[0];
    return {
      title: info.title ?? info.description ?? null,
      authorName: info.uploader ?? info.creator ?? null,
      playUrl: bestAudio?.url ?? info.url ?? null,
      coverUrl: info.thumbnail ?? null,
      fileSizeBytes: null,
    };
  } catch (err) {
    const isEnv = isYtDlpEnvError(err);
    console.warn(`[VideoProcessor:tiktok] yt-dlp failed${isEnv ? ' (yt-dlp not in PATH)' : ''}:`, err);
    return { title: null, authorName: null, playUrl: null, coverUrl: null };
  }
}

/**
 * YouTube Shorts — uses youtube-transcript for direct text extraction.
 * Whisper is a fallback only if transcript is unavailable.
 */
async function fetchShortsMeta(url: string, fallbackTitle: string | null): Promise<PlatformMeta> {
  const cobaltMeta = await fetchMetaViaCobalt(url);
  if (cobaltMeta?.playUrl) {
    return {
      title: cobaltMeta.title ?? fallbackTitle,
      authorName: null,
      playUrl: cobaltMeta.playUrl,
      coverUrl: cobaltMeta.coverUrl,
    };
  }
  return {
    title: fallbackTitle,
    authorName: null,
    playUrl: null,
    coverUrl: null,
  };
}

/**
 * Instagram Reels — uses Cobalt API with yt-dlp fallback.
 */
async function fetchReelsMeta(
  url: string,
  fallbackTitle: string | null,
): Promise<PlatformMeta & { _noContext?: boolean }> {
  const cobaltMeta = await fetchMetaViaCobalt(url);
  if (cobaltMeta?.playUrl) {
    return { ...cobaltMeta, title: cobaltMeta.title ?? fallbackTitle };
  }

  try {
    const info = await withTimeout(ytDlp.getVideoInfo(url), METADATA_TIMEOUT_MS, 'Reels yt-dlp');
    const bestAudio = info.formats
      ?.filter((f: any) => f.acodec !== 'none')
      ?.sort((a: any, b: any) => (b.tbr ?? 0) - (a.tbr ?? 0))[0];
    return {
      title: info.title ?? info.description ?? fallbackTitle,
      authorName: info.uploader ?? info.creator ?? null,
      playUrl: bestAudio?.url ?? info.url ?? null,
      coverUrl: info.thumbnail ?? null,
      fileSizeBytes: null,
    };
  } catch (err) {
    const isEnv = isYtDlpEnvError(err);
    console.warn(`[VideoProcessor:reels] yt-dlp failed${isEnv ? ' (yt-dlp not in PATH)' : ''}:`, err);
    return { title: fallbackTitle, authorName: null, playUrl: null, coverUrl: null, _noContext: true };
  }
}

// ─── Shared Whisper + Vision Pipeline ─────────────────────────────────────────

async function runTranscriptionPipeline(
  meta: PlatformMeta,
  result: ShortVideoContext,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  const playUrl = meta.playUrl;
  const coverUrl = meta.coverUrl;

  // ── Step 1: Whisper transcription task ──────────────────────────────────────
  if (!result.transcription && playUrl && (!meta.fileSizeBytes || meta.fileSizeBytes <= MAX_VIDEO_SIZE)) {
    tasks.push((async () => {
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | null = setTimeout(
        () => controller.abort(),
        MEDIA_DOWNLOAD_TIMEOUT_MS,
      );

      try {
        const videoRes = await fetch(playUrl, { signal: controller.signal });
        if (!videoRes.ok) throw new Error(`Video fetch failed: ${videoRes.status}`);

        const arrayBuffer = await videoRes.arrayBuffer();

        if (arrayBuffer.byteLength > 0 && arrayBuffer.byteLength <= MAX_VIDEO_SIZE) {
          const groqFile = new File([arrayBuffer], 'video.mp4', { type: 'video/mp4' });
          const groq = getGroqClient();
          const transcription = await withTimeout(
            groq.audio.transcriptions.create({
              file: groqFile,
              model: 'whisper-large-v3-turbo',
              response_format: 'json',
              temperature: 0.0,
            }),
            TRANSCRIPTION_TIMEOUT_MS,
            'Whisper transcription',
          );

          if (transcription.text?.trim().length > 0) {
            result.transcription = transcription.text.trim();
            console.log(
              `[VideoProcessor:${result.platform}] Whisper extracted (${transcription.text.length} chars)`,
            );
          } else {
            console.log(`[VideoProcessor:${result.platform}] Whisper returned empty text.`);
          }
        }
      } catch (err) {
        console.warn(`[VideoProcessor:${result.platform}] Whisper failed:`, err);
      } finally {
        if (timeout !== null) {
          clearTimeout(timeout);
          timeout = null;
        }
      }
    })());
  }

  // ── Step 2: Vision analysis task ───────────────────────────────────────────
  if (coverUrl) {
    tasks.push((async () => {
      try {
        const { text } = await withTimeout(
          generateText({
            model: googleProvider('gemini-3.1-flash-lite'),
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
          }),
          VISION_TIMEOUT_MS,
          'Thumbnail vision',
        );

        if (text?.trim()) {
          result.visionAnalysis = text.trim();
          console.log(
            `[VideoProcessor:${result.platform}] Vision extracted (${text.length} chars)`,
          );
        }
      } catch (err) {
        console.warn(`[VideoProcessor:${result.platform}] Vision failed:`, err);
      }
    })());
  }

  await Promise.allSettled(tasks);

  if (!result.transcription && !result.visionAnalysis) {
    console.warn(
      `[VideoProcessor:${result.platform}] WARNING: No transcription or vision analysis available.`,
    );
  }
}

// ─── Public Entry Point ───────────────────────────────────────────────────────

export async function processShortVideo(
  platform: ShortVideoPlatform,
  url: string,
  fallbackTitle: string | null = null,
  externalCoverUrl: string | null = null,
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
      const reelsMeta = await fetchReelsMeta(cleanUrl, fallbackTitle);
      if ((reelsMeta as any)._noContext) {
        result.hasNoContext = true;
      }
      meta = reelsMeta;
    }

    result.title = meta.title ?? fallbackTitle;
    result.authorName = meta.authorName;
    result.thumbnailUrl = meta.coverUrl ?? externalCoverUrl;
    if (!meta.coverUrl && externalCoverUrl) meta.coverUrl = externalCoverUrl;

    console.log(
      `[VideoProcessor:${platform}] Meta → Title: "${result.title}", Author: "${result.authorName}"`,
    );

    // YouTube Shorts: try transcript first
    if (platform === 'shorts') {
      try {
        let videoId = cleanUrl;
        if (cleanUrl.includes('/shorts/')) {
          videoId = cleanUrl.split('/shorts/')[1].split('?')[0];
        } else if (cleanUrl.includes('v=')) {
          videoId = new URL(cleanUrl).searchParams.get('v') ?? cleanUrl;
        } else if (cleanUrl.includes('youtu.be/')) {
          videoId = cleanUrl.split('youtu.be/')[1].split('?')[0];
        }

        const transcriptItems = await withTimeout(
          YoutubeTranscript.fetchTranscript(videoId),
          METADATA_TIMEOUT_MS,
          'YouTube transcript',
        );
        if (transcriptItems && transcriptItems.length > 0) {
          result.transcription = transcriptItems.map((item: any) => item.text).join(' ');
          console.log(
            `[VideoProcessor:shorts] youtube-transcript extracted (${result.transcription.length} chars)`,
          );
        }
      } catch (err) {
        console.warn('[VideoProcessor:shorts] youtube-transcript failed:', err);
      }
    }

    await runTranscriptionPipeline(meta, result);
  } catch (err) {
    console.warn(`[VideoProcessor:${platform}] Flow failed, returning basic metadata:`, err);
    result.error = 'Multimodal fetch degraded gracefully.';
  }

  return result;
}

export async function processTikTokMultimodal(
  url: string,
  oEmbedTitle: string | null,
): Promise<FullTikTokContext> {
  return processShortVideo('tiktok', url, oEmbedTitle);
}