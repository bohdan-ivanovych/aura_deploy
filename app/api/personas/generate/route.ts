import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/ai/groq';
import { env } from '@/lib/env';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { getVoicesByAccent, getVoiceById, VoiceEntry } from '@/config/voices';

async function pickVoice(
  groq: ReturnType<typeof getGroqClient>,
  accent: 'us' | 'gb',
  genderPreference: string | undefined,
  name: string,
  description: string,
): Promise<string> {
  let voices: VoiceEntry[] = getVoicesByAccent(accent);

  if (genderPreference && genderPreference !== 'auto') {
    const gf = voices.filter((v) => v.gender === genderPreference);
    if (gf.length > 0) voices = gf;
  }

  const voiceList = voices
    .map((v) => `{ "voiceId": "${v.id}", "name": "${v.name}", "gender": "${v.gender}", "vibe": [${v.vibe.map((x) => `"${x}"`).join(', ')}] }`)
    .join('\n');

  const systemPrompt = `You are a voice-casting expert for AI personas.
Your ONLY task is to pick the best Azure Neural voice from the list below for the given persona.
Base your decision on: (1) best vibe/personality match, (2) age/character fit.

Available voices (${accent.toUpperCase()} accent${genderPreference && genderPreference !== 'auto' ? `, ${genderPreference} only` : ''}):
${voiceList}

Respond with ONLY a single JSON object — no markdown, no explanation:
{"voiceId": "<chosen voice id>"}`;

  const completion = await groq.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Persona name: "${name}"\nDescription: "${description || ''}"` },
    ],
    max_tokens: 60,
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  let voiceId: string | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.voiceId === 'string') voiceId = parsed.voiceId;
  } catch {
    const match = raw.match(/"voiceId"\s*:\s*"([^"]+)"/);
    if (match) voiceId = match[1];
  }

  if (!voiceId || !getVoiceById(voiceId)) {
    voiceId = voices[0].id;
  }

  return voiceId;
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, genderPreference } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const groq = getGroqClient();
    await getOrCreateUser();

    const [voiceIdUS, voiceIdGB] = await Promise.all([
      pickVoice(groq, 'us', genderPreference, name, description ?? ''),
      pickVoice(groq, 'gb', genderPreference, name, description ?? ''),
    ]);

    const usVoice = getVoiceById(voiceIdUS)!;
    const gbVoice = getVoiceById(voiceIdGB)!;

    return NextResponse.json({
      voiceId: voiceIdUS,
      voiceIdUS,
      voiceIdGB,
      voiceName: usVoice.name,
      accent: usVoice.accent,
      gender: usVoice.gender,
      vibe: usVoice.vibe,
      voiceNameGB: gbVoice.name,
    });
  } catch (error) {
    console.error('Voice generate error:', error);
    return NextResponse.json({ error: 'Failed to generate voice match' }, { status: 500 });
  }
}
