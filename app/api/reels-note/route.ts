import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { processShortVideo } from '@/lib/ai/video-processor';
import { generateVideoNote, VideoNoteData } from '@/lib/ai/video-note';

export type { VideoNoteData };

/**
 * POST /api/reels-note
 *
 * Body: { url: string }  — an instagram.com/reels/... URL
 *
 * Returns a VideoNoteData card with the linguistically interesting
 * phrase extracted from the Instagram Reels video content.
 *
 * Note: Instagram does NOT provide a public oEmbed API for Reels,
 * so we rely entirely on the multimodal pipeline (cobalt → Whisper → Vision).
 */
export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize URL: extract the Reels URL and strip query params
    const urlMatch = url.match(
      /https?:\/\/(?:www\.)?instagram\.com\/(?:reels?|p)\/[\w-]+\/?/i,
    );
    const cleanUrl = urlMatch ? urlMatch[0].split('?')[0] : url.trim().split('?')[0];

    const user = await getOrCreateUser();

    // Full multimodal extraction (cobalt → Whisper + Vision fallback)
    // No oEmbed available for Instagram — fallbackTitle will be null
    const ctx = await processShortVideo('reels', cleanUrl, null);

    // Generate the educational Note card
    const note = await generateVideoNote(ctx, user.nativeLanguage || 'uk', user.explanationLanguage || 'english');

    return NextResponse.json(note);
  } catch (error) {
    console.error('reels-note error:', error);
    return NextResponse.json({ error: 'Failed to generate Reels note' }, { status: 500 });
  }
}
