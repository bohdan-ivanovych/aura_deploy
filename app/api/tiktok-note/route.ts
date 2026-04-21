import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';
import { processTikTokMultimodal } from '@/lib/ai/tiktok-processor';

const LANG_CODE_TO_NAME: Record<string, string> = {
  uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
  de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
  tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
};

export interface TikTokNoteData {
  videoTitle: string;
  authorName: string;
  thumbnailUrl: string | null;
  noteType: 'english_phrase' | 'cross_language';
  phrase: string;
  explanation: string;
  examples: string[];
  funFact: string | null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalise URL — extract the actual TikTok URL and resolve vm.tiktok.com short links
    const urlMatch = url.match(/https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/\S+/i);
    const cleanUrl = urlMatch ? urlMatch[0].split('?')[0] : url.trim().split('?')[0];

    const user = await getOrCreateUser();
    const nativeLangCode = user.nativeLanguage || 'uk';
    const nativeLang = LANG_CODE_TO_NAME[nativeLangCode] || 'Ukrainian';
    const explanationLang = (user.explanationLanguage === 'native') ? nativeLang : 'English';

    // ── Step 1: Multimodal Fetch (TikWM + Whisper + Vision Fallback) ───────
    // We use oEmbed as a basic fallback title inside the processor
    let fallbackTitle = '';
    let thumbnailUrl: string | null = null;
    let authorName = '';

    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        fallbackTitle = oembed.title || '';
        authorName = oembed.author_name || '';
        thumbnailUrl = oembed.thumbnail_url || null;
      }
    } catch { /* silent */ }

    // Run deep semantic parser
    const multimodalCtx = await processTikTokMultimodal(cleanUrl, fallbackTitle);
    
    // We update author name if the processor found a better one
    authorName = multimodalCtx.authorName || authorName;
    const finalTitle = multimodalCtx.title || fallbackTitle;

    // ── Step 2: Groq — analyse title, pick interesting phrase ──────────────
    const groq = getGroqClient();

    const systemPrompt = `You are a language educator and cultural analyst specialising in TikTok content and English linguistics.
Your role: given a TikTok video title and author, identify the single most linguistically interesting or educationally valuable element and create a concise "TikTok Note" card.

Rules:
- If the title is mostly English: pick the most interesting phrase, idiom, slang, or expression — something genuinely interesting, not obvious.
- If the title is in another language (or mixed): focus on how this concept/phrase is expressed in English, what's culturally fascinating about the translation, or any faux ami / false cognate potential.
- "noteType": "english_phrase" if title is primarily English, "cross_language" if it's another language.
- "phrase": the specific word/phrase/expression you're highlighting (max 6 words, always written in English).
- "explanation": written in ${explanationLang} (2-3 engaging sentences). Explain what makes this phrase interesting.
- "examples": ALWAYS write these in English regardless of the explanation language. 2 real-world example sentences showing the phrase used naturally — NOT textbook sentences. Conversational, vivid, memorable.
- "funFact": one optional cultural/linguistic curiosity that would genuinely delight a language learner — or null.

Return ONLY valid JSON, no markdown:
{
  "noteType": "english_phrase" | "cross_language",
  "phrase": "highlighted phrase in English",
  "explanation": "...",
  "examples": ["English sentence 1", "English sentence 2"],
  "funFact": "..." | null
}`;

    const ctxLines: string[] = [
      `TikTok URL: ${cleanUrl}`,
      finalTitle ? `Title: "${finalTitle}"` : '',
      authorName ? `Creator: @${authorName}` : '',
      multimodalCtx.transcription ? `[TRANSCRIPTION]: "${multimodalCtx.transcription}"` : '',
      multimodalCtx.visionAnalysis ? `[VISION ANALYSIS]: "${multimodalCtx.visionAnalysis}"` : '',
    ].filter(Boolean);

    const userPrompt = ctxLines.join('\n') + `\n\nAnalyze the content of the video based on the data above. If transcription/vision is missing, provide a fun note about a popular English slang term currently used on TikTok. Do NOT analyze the URL structure.`;

    let noteResult: Omit<TikTokNoteData, 'videoTitle' | 'authorName' | 'thumbnailUrl'> = {
      noteType: 'english_phrase',
      phrase: 'TikTok',
      explanation: 'Could not generate note for this video.',
      examples: [],
      funFact: null,
    };

    try {
      const completion = await Promise.race([
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 512,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out')), 12_000)),
      ]);

      const raw = completion.choices[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      noteResult = {
        noteType: parsed.noteType === 'cross_language' ? 'cross_language' : 'english_phrase',
        phrase: parsed.phrase || 'TikTok',
        explanation: parsed.explanation || '',
        examples: Array.isArray(parsed.examples) ? parsed.examples.slice(0, 3) : [],
        funFact: parsed.funFact || null,
      };
    } catch {
      // Keep default noteResult
    }

    return NextResponse.json({
      videoTitle: finalTitle,
      authorName,
      thumbnailUrl,
      ...noteResult,
    } satisfies TikTokNoteData);

  } catch (error) {
    console.error('tiktok-note error:', error);
    return NextResponse.json({ error: 'Failed to generate TikTok note' }, { status: 500 });
  }
}
