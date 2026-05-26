import { NextRequest, NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }
    const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 900);

    // getAllAudioBase64 splits the text into chunks and fetches them
    const results = await googleTTS.getAllAudioBase64(cleanText, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?!',
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[TTS API Error]:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
