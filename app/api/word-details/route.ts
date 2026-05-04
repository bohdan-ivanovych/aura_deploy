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

    // 2. Explanation / Usage (Always English)
    let explanation = '';

    try {
      const groq = getGroqClient();
      const prompt = `Provide a concise English usage explanation for the phrase/word "${word}". Provide general usage that would be helpful on a flashcard. Context from the conversation: "${contextSentence}". DO NOT mention the word "context" or "sentence" in your output. DO NOT say "In this sentence". Just give the general usage. Max 1-2 sentences. Only the usage text, no extra formatting.`;

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

    return NextResponse.json({
      translation: translation || '',
      explanation: explanation || '',
    });
  } catch (error) {
    console.error('wordDetails API error:', error);
    return NextResponse.json({ error: 'Failed to get word details' }, { status: 500 });
  }
}
