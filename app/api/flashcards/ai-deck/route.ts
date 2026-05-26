import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { makeAIJsonCompletion } from '@/lib/ai/multi-groq';

/**
 * POST /api/flashcards/ai-deck
 * Body: { topic: string, count?: number }
 * Returns: { cards: { front: string, back: string }[] }
 */
export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { topic, count = 10 } = await req.json();

    if (!topic || topic.trim().length < 2) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const nativeLang = user.nativeLanguage || 'uk';

    const langNames: Record<string, string> = {
      uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
      de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
      tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
      hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
      ru: 'Russian', cs: 'Czech', ro: 'Romanian', fi: 'Finnish',
    };
    const nativeLangName = langNames[nativeLang] || 'Ukrainian';

    const cards = await makeAIJsonCompletion<{ cards: { front: string; back: string }[] }>({
      messages: [
        {
          role: 'system',
          content: `You are a helpful English vocabulary assistant. Generate a flashcard set.
Return ONLY valid JSON in exactly this format:
{"cards": [{"front": "English word/phrase", "back": "${nativeLangName} translation"}, ...]}
No extra text, no markdown, just the JSON object.`,
        },
        {
          role: 'user',
          content: `Generate ${Math.min(count, 20)} English vocabulary flashcards about: "${topic.trim()}".
Each card: front = English term, back = ${nativeLangName} translation.
Focus on the most useful, commonly used words/phrases for this topic.`,
        },
      ],
      temperature: 0.4,
    });

    if (!cards?.cards || !Array.isArray(cards.cards)) {
      return NextResponse.json({ error: 'AI returned invalid data' }, { status: 500 });
    }

    const validCards = cards.cards
      .filter((c: any) => typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim())
      .slice(0, 20);

    return NextResponse.json({ cards: validCards });
  } catch (error) {
    console.error('AI deck generation error:', error);
    return NextResponse.json({ error: 'Failed to generate deck' }, { status: 500 });
  }
}
