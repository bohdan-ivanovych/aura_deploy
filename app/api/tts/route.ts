import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { rateLimit } from '@/lib/utils/rate-limit';

const MAX_TEXT_LENGTH = 600;
const RATE_LIMIT = 80;
const RATE_WINDOW_MS = 60 * 60_000;

// Azure Neural TTS via Microsoft Cognitive Services Speech SDK
// The SDK is already installed as microsoft-cognitiveservices-speech-sdk
const AZURE_KEY  = process.env.AZURE_SPEECH_KEY  ?? '';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus';

// Language/voice map — keyed by the first segment of the voiceId from config/voices.ts
// Falls back to SSML-based synthesis with the full voiceId when it's a neural Azure voice.
const LANG_VOICE_MAP: Record<string, string> = {
  'uk':    'uk-UA-PolinaNeural',   // Ukrainian — high quality
  'en-GB': 'en-GB-RyanNeural',
  'en-US': 'en-US-JennyNeural',
  'ru':    'ru-RU-SvetlanaNeural',
  'de':    'de-DE-KatjaNeural',
  'fr':    'fr-FR-DeniseNeural',
  'es':    'es-ES-ElviraNeural',
  'pl':    'pl-PL-AgnieszkaNeural',
};

function resolveVoice(voiceId?: string): string {
  if (!voiceId) return 'en-US-JennyNeural';
  // If it already looks like a full Azure neural voice name, use it directly
  if (voiceId.includes('Neural')) return voiceId;
  // Otherwise map by language prefix
  const lang = voiceId.split('-').slice(0, 2).join('-');
  return LANG_VOICE_MAP[lang] ?? LANG_VOICE_MAP[voiceId] ?? 'en-US-JennyNeural';
}

async function synthesizeWithAzure(text: string, voiceName: string): Promise<Buffer> {
  const {
    SpeechConfig,
    SpeechSynthesizer,
    ResultReason,
    AudioConfig,
  } = await import('microsoft-cognitiveservices-speech-sdk');

  const speechConfig = SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
  speechConfig.speechSynthesisVoiceName = voiceName;
  speechConfig.speechSynthesisOutputFormat = 8; // Audio16Khz32KBitRateMonoMp3

  // Synthesize to in-memory buffer (no AudioConfig = pull-stream mode)
  return new Promise<Buffer>((resolve, reject) => {
    const synthesizer = new SpeechSynthesizer(speechConfig);
    synthesizer.speakTextAsync(
      text,
      (result) => {
        synthesizer.close();
        if (result.reason === ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData));
        } else {
          reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
        }
      },
      (err) => {
        synthesizer.close();
        reject(new Error(`Azure TTS error: ${err}`));
      },
    );
  });
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const allowed = await rateLimit(`tts:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const { text, voiceId } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const truncatedText = text.slice(0, MAX_TEXT_LENGTH);

    // ── Azure Neural TTS (primary) ──────────────────────────────────────────
    if (AZURE_KEY) {
      const voiceName = resolveVoice(voiceId);
      const audioBuffer = await synthesizeWithAzure(truncatedText, voiceName);
      return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.byteLength),
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-TTS-Engine': 'azure-neural',
          'X-TTS-Voice': voiceName,
        },
      });
    }

    // ── Google TTS fallback (no Azure key configured) ───────────────────────
    const { default: googleTTS } = await import('google-tts-api') as any;
    const lang = voiceId ? voiceId.split('-')[0].toLowerCase() : 'en';
    const results = await googleTTS.getAllAudioBase64(truncatedText, {
      lang,
      slow: false,
      host: 'https://translate.google.com',
    });
    const buffers = results.map((r: { base64: string }) => Buffer.from(r.base64, 'base64'));
    const audioBuffer = Buffer.concat(buffers);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
        'X-TTS-Engine': 'google-fallback',
      },
    });
  } catch (err) {
    const { captureException } = await import('@sentry/nextjs');
    captureException(err, { extra: { route: '/api/tts' } });
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
