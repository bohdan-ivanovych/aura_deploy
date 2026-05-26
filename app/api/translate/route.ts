import { NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';
import { getOrCreateUser } from '@/lib/auth/api-utils';

export async function POST(req: Request) {
  try {
    const { text, targetLang } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    let finalLang = targetLang;
    if (!finalLang || finalLang === 'Ukrainian') {
      try {
        const user = await getOrCreateUser();
        const LANG_CODE_TO_NAME: Record<string, string> = {
          uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
          de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
          tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
          hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
        };
        finalLang = LANG_CODE_TO_NAME[user.nativeLanguage] || 'Ukrainian';
      } catch (e) {
        finalLang = 'Ukrainian';
      }
    }

    let translated = '';
    
    // Reverse map finalLang name (e.g. 'Ukrainian') to language code ('uk')
    const NAME_TO_LANG_CODE: Record<string, string> = {
      ukrainian: 'uk', english: 'en', spanish: 'es', polish: 'pl',
      german: 'de', french: 'fr', italian: 'it', portuguese: 'pt',
      turkish: 'tr', japanese: 'ja', chinese: 'zh', arabic: 'ar',
      hindi: 'hi', korean: 'ko', dutch: 'nl', swedish: 'sv',
    };
    const targetLangCode = NAME_TO_LANG_CODE[finalLang.toLowerCase()] || 'uk';

    try {
      const gRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(text)}`
      );
      if (gRes.ok) {
        const tData = await gRes.json();
        if (tData && tData[0] && tData[0][0]) {
          translated = tData[0][0][0];
        }
      }
    } catch (e) {
      console.warn('Google Translate API query failed, falling back to Groq:', e);
    }

    if (!translated) {
      const groq = getGroqClient();
      const completion = await Promise.race([
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the given text to ${finalLang}. Return ONLY the translated text, nothing else. No quotes, no explanations, no notes.`,
            },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Translation timed out')), 15_000)
        ),
      ]);
      translated = completion.choices[0]?.message?.content?.trim() || '';
    }

    return NextResponse.json({ translated, original: text, targetLang });
  } catch (error) {
    console.error('Translate error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
