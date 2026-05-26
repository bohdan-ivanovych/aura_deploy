import { NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';
import { getOrCreateUser } from '@/lib/auth/api-utils';

const LANG_CODE_TO_NAME: Record<string, string> = {
  uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
  de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
  tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
};

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { word } = await req.json();

    if (!word || word.trim().length < 2) {
      return NextResponse.json({ suggestion: null });
    }

    const nativeLangCode = user.nativeLanguage || 'uk';
    const nativeLang = LANG_CODE_TO_NAME[nativeLangCode] || 'Ukrainian';

    // 1. Use Google Translate API for translation (fast, free, accurate)
    let translation = word;
    try {
      const gRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${nativeLangCode}&dt=t&q=${encodeURIComponent(word)}`
      );
      if (gRes.ok) {
        const tData = await gRes.json();
        if (tData && tData[0] && tData[0][0]) {
          translation = tData[0][0][0];
        }
      }
    } catch (e) {
      console.error('Google Translate error:', e);
    }

    // 2. Get English explanation via Groq
    let englishExplanation = '';
    try {
      const groq = getGroqClient();
      const completion = await Promise.race([
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `Provide a concise English definition for the word/phrase. Return ONLY the definition, no extra text. Max 1 sentence.`
            },
            {
              role: 'user',
              content: word
            }
          ],
          max_tokens: 80,
          temperature: 0.3,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      englishExplanation = completion.choices[0]?.message?.content?.trim() || '';
    } catch (e) {
      console.error('Groq explanation error:', e);
    }

    return NextResponse.json({ 
      suggestion: {
        back: translation,
        englishExplanation: englishExplanation
      }
    });
  } catch (error) {
    console.error('Suggest flashcard error:', error);
    return NextResponse.json({ error: 'Failed to suggest' }, { status: 500 });
  }
}
