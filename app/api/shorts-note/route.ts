import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { processShortVideo } from '@/lib/ai/video-processor';
import { generateVideoNote, VideoNoteData } from '@/lib/ai/video-note';

export type { VideoNoteData };

/**
 * POST /api/shorts-note
 *
 * Body: { url: string }  — a youtube.com/shorts/... or youtu.be/... URL
 *
 * Returns a VideoNoteData card with the linguistically interesting
 * phrase extracted from the YouTube Shorts video content.
 */
export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize URL: extract the Shorts URL and strip query params
    const urlMatch = url.match(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+)\S*/i,
    );
    const cleanUrl = urlMatch ? urlMatch[0].split('?')[0] : url.trim().split('?')[0];

    const user = await getOrCreateUser();

    // Attempt to grab a title via oEmbed (YouTube supports this)
    let fallbackTitle = '';
    let thumbnailUrl: string | null = null;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3_000) },
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        fallbackTitle = oembed.title || '';
        thumbnailUrl = oembed.thumbnail_url || null;
      }
    } catch { /* silent */ }

    // Full multimodal extraction (Whisper + Vision fallback)
    // Pass oEmbed thumbnail so Vision can always analyze the cover image
    const ctx = await processShortVideo('shorts', cleanUrl, fallbackTitle, thumbnailUrl);
    if (!ctx.thumbnailUrl && thumbnailUrl) ctx.thumbnailUrl = thumbnailUrl;

    // Generate the educational Note card
    const note = await generateVideoNote(ctx, user.nativeLanguage || 'uk', user.explanationLanguage || 'english');

    return NextResponse.json(note);
  } catch (error) {
    console.error('shorts-note error:', error);
    return NextResponse.json({ error: 'Failed to generate Shorts note' }, { status: 500 });
  }
}
