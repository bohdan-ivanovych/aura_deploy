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
    const { word, contextSentence } = await req.json();
    if (!word || typeof word !== 'string') {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const user = await getOrCreateUser();
    const nativeLangCode = user.nativeLanguage || 'uk';
    const nativeLang = LANG_CODE_TO_NAME[nativeLangCode] || 'Ukrainian';
    const useNative = user.explanationLanguage === 'native';
    const explanationLang = useNative ? nativeLang : 'English';

    // 1. Fetch translation via Google Translate unofficial API (fast, free)
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
    } catch {}

    // 2. Explanation — language-aware
    let explanation = '';

    if (!useNative) {
      // English: try free Dictionary API first (fast, no token cost)
      try {
        const dRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (dRes.ok) {
          const dData = await dRes.json();
          const def = dData[0]?.meanings[0]?.definitions[0]?.definition;
          if (def) explanation = def;
        }
      } catch {}
    }

    // If native language requested OR English dictionary failed, use Groq
    if (!explanation) {
      try {
        const groq = getGroqClient();
        const ctx = contextSentence ? `Context: "${contextSentence}"` : '';
        const prompt = useNative
          ? `Provide a short, clear explanation of the English word "${word}" in ${explanationLang}. ${ctx}\nMax 1-2 sentences. Only the explanation, no extra formatting.`
          : `Define "${word}" in simple English. ${ctx}\nMax 1 sentence. Only the definition.`;

        const completion = await Promise.race([
          groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 120,
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
        ]);
        explanation = completion.choices[0]?.message?.content?.trim() || '';
      } catch {}
    }

    return NextResponse.json({
      translation: translation || '',
      explanation: explanation || '',
    });
  } catch (error) {
    console.error('wordDetails API error:', error);
    return NextResponse.json({ error: 'Failed to get word details' }, { status: 500 });
  }
}
