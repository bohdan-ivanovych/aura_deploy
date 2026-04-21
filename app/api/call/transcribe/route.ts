import { getOrCreateUser } from '@/lib/auth/api-utils';
import { getGroqClient } from '@/lib/ai/groq';
import { rateLimit } from '@/lib/utils/rate-limit';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const allowed = await rateLimit(`call-transcribe:${user.id}`, 120, 3_600_000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded. Slow down.' }, { status: 429 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return Response.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 });
    }

    const groq = getGroqClient();

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: user.nativeLanguage === 'uk' ? undefined : user.nativeLanguage ?? undefined,
      response_format: 'text',
    });

    const text = typeof transcription === 'string' ? transcription : (transcription as any).text ?? '';

    return Response.json({ text: text.trim() });
  } catch (error) {
    Sentry.captureException(error, { extra: { route: '/api/call/transcribe' } });
    console.error('Transcription error:', error);
    return Response.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
