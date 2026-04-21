import { NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { parseAIReply } from '@/lib/ai/ai-utils';

export async function POST(req: Request) {
  try {
    const { phrase, contextSentence } = await req.json();

    if (!phrase || !contextSentence) {
      return NextResponse.json({ error: 'Missing phrase or context' }, { status: 400 });
    }

    const groq = getGroqClient();
    const user = await getOrCreateUser();

    const LANGUAGE_NAMES: Record<string, string> = {
      uk: 'Ukrainian', en: 'English', es: 'Spanish', fr: 'French',
      de: 'German', it: 'Italian', pt: 'Portuguese', pl: 'Polish',
      ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
      ar: 'Arabic', tr: 'Turkish', nl: 'Dutch', sv: 'Swedish',
      da: 'Danish', fi: 'Finnish', cs: 'Czech', ro: 'Romanian',
      hu: 'Hungarian', el: 'Greek', he: 'Hebrew', hi: 'Hindi',
    };
    const langCode = (user.nativeLanguage ?? 'en').toLowerCase().split('-')[0];
    const nativeLanguage = LANGUAGE_NAMES[langCode] ?? user.nativeLanguage ?? 'English';

    const systemPrompt = `You are a linguistic processor for Aura OS. 
The user highlighted the word/phrase '${phrase}' within this context: '${contextSentence}'. 
Provide a concise, accurate translation in ${nativeLanguage} based STRICTLY on how it is used in this context. 
Return a JSON object: { "translation": "The translated text" }.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: "${contextSentence}"\nTarget Phrase: "${phrase}"` },
      ],
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const parsed = parseAIReply<{ translation: string }>(rawContent);

    if (!parsed.translation) {
      throw new Error('AI failed to generate a valid translation');
    }

    const flashcard = await prisma.flashcard.create({
      data: {
        userId: user.id,
        front: phrase,
        back: parsed.translation,
        contextSentence,
        nextReview: new Date(), // due immediately — FSRS will schedule from first review
      },
    });

    return NextResponse.json({ success: true, flashcard });
  } catch (error) {
    console.error('Flashcard creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Neural uplink failed' },
      { status: 500 }
    );
  }
}
