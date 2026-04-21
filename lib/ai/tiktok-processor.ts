import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getGroqClient } from '@/lib/ai/groq';

export interface FullTikTokContext {
  title: string | null;
  authorName: string | null;
  transcription: string | null;
  visionAnalysis: string | null;
  error?: string; // If something failed but we gracefully recovered
}

const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB
const MEDIA_DOWNLOAD_TIMEOUT_MS = 12000;

export async function processTikTokMultimodal(url: string, oEmbedTitle: string | null): Promise<FullTikTokContext> {
  const result: FullTikTokContext = {
    title: oEmbedTitle,
    authorName: null,
    transcription: null,
    visionAnalysis: null,
  };

  try {
    const cleanUrl = url.trim().split('?')[0];
    
    // 1. Fetch metadata from TikWM
    const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      // tikwm can be slow sometimes, fail fast
      signal: AbortSignal.timeout(2000),
    });

    if (!tikRes.ok) throw new Error(`TikWM failed with status ${tikRes.status}`);
    const tikData = await tikRes.json();
    
    if (tikData.code !== 0 || !tikData.data) {
      throw new Error('TikWM returned no valid data');
    }

    const { title, author, play, origin_cover, size } = tikData.data;
    
    result.title = title || result.title;
    result.authorName = author?.unique_id || author?.nickname || null;

    console.log(`[TikTok Processor] Fetched data for URL: ${url}`);
    console.log(`[TikTok Processor] Metadata -> Title: "${result.title}", Author: "${result.authorName}"`);

    let gotAudio = false;

    // 2. Attempt Video Download & Audio Transcription
    if (play && (!size || size <= MAX_VIDEO_SIZE)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), MEDIA_DOWNLOAD_TIMEOUT_MS);

        const videoRes = await fetch(play, { signal: controller.signal });
        if (!videoRes.ok) throw new Error('Video fetch failed');

        const arrayBuffer = await videoRes.arrayBuffer();
        clearTimeout(timeout);

        if (arrayBuffer.byteLength > 0 && arrayBuffer.byteLength <= MAX_VIDEO_SIZE) {
          // Convert arrayBuffer to File object for the unofficial groq sdk
          // The groq SDK accepts File or ReadStream. For edge/serverless we can mock a File object
          const groqFile = new File([arrayBuffer], 'video.mp4', { type: 'video/mp4' });

          const groq = getGroqClient();
          const transcription = await groq.audio.transcriptions.create({
            file: groqFile,
            model: 'whisper-large-v3-turbo',
            response_format: 'json',
            temperature: 0.0,
          });

          if (transcription.text && transcription.text.trim().length > 0) {
            result.transcription = transcription.text.trim();
            gotAudio = true;
            console.log(`[TikTok Processor] Whisper Transcription Extracted (${transcription.text.length} chars)`);
          } else {
            console.log('[TikTok Processor] Whisper Transcription returned empty text.');
          }
        }
      } catch (err) {
        // Silently catch and fallback to vision
        console.warn('[TikTok Processor] Whisper transcription failed or timed out:', err);
      }
    }

    // 3. Fallback to Vision if transcription was empty or failed
    if (!gotAudio && origin_cover) {
      try {
        const coverRes = await fetch(origin_cover, { signal: AbortSignal.timeout(2000) });
        if (coverRes.ok) {
          const coverBuffer = await coverRes.arrayBuffer();
          const p = Buffer.from(coverBuffer).toString('base64');
          const mimeType = coverRes.headers.get('content-type') || 'image/jpeg';
          
          console.log('[TikTok Processor] Falling back to Vision API...');

          const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: "You are an AI analyzing a TikTok video cover. Describe exactly what is happening in the scene, the emotion, and carefully extract ANY text written on the screen (OCR). Keep it concise but highly descriptive." },
                  { type: 'image', image: coverBuffer }
                ]
              }
            ],
            temperature: 0.4
          });

          result.visionAnalysis = text || null;
          console.log(`[TikTok Processor] Vision analysis extracted (${text?.length || 0} chars)`);
        }
      } catch (err) {
        console.warn('[TikTok Processor] Vision fallback failed:', err);
      }
    }

  } catch (err) {
    console.warn('[TikTok Processor] Multimodal flow failed, returning basic metadata:', err);
    result.error = 'Multimodal fetch degraded gracefully.';
  }

  return result;
}
