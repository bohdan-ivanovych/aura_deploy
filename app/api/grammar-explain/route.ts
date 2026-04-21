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
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Read user language preference
    const user = await getOrCreateUser();
    const nativeLangCode = user.nativeLanguage || 'uk';
    const nativeLang = LANG_CODE_TO_NAME[nativeLangCode] || 'Ukrainian';
    const explanationLang = (user.explanationLanguage === 'native') ? nativeLang : 'English';

    const groq = getGroqClient();

    const completion = await Promise.race([
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert English grammar teacher. Analyze the given English sentence and identify the most interesting grammar topic demonstrated by it.

IMPORTANT: Write ALL text fields (explanation, tip) in ${explanationLang}. Only the "topic" field may stay in English as it is a grammar term name.
The "examples" array must always contain English sentences.

Return a JSON object with this exact structure:
{
  "topic": "Grammar Topic Name in English (e.g. 'Present Perfect', 'Modal Verbs', 'Passive Voice')",
  "explanation": "Clear 2-3 sentence explanation of this grammar rule — written in ${explanationLang}",
  "examples": ["Example sentence 1 in English", "Example sentence 2 in English"],
  "tip": "One practical memory tip or common mistake to avoid — written in ${explanationLang}"
}
Return ONLY valid JSON, no markdown, no code blocks.`,
          },
          { role: 'user', content: `Analyze this sentence: "${text}"` },
        ],
        temperature: 0.4,
        max_tokens: 600,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out')), 15_000)
      ),
    ]);

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Parse error', raw }, { status: 500 });
    }
  } catch (error) {
    console.error('Grammar explain error:', error);
    return NextResponse.json({ error: 'Failed to explain grammar' }, { status: 500 });
  }
}
