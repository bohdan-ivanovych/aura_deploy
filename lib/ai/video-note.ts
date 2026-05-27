/**
 * video-note.ts
 *
 * Shared LLM analysis logic for generating educational "Note" cards
 * from short-form video content (TikTok, YouTube Shorts, Instagram Reels).
 *
 * Called by /api/tiktok-note, /api/shorts-note, /api/reels-note.
 */

import { makeAICompletion } from '@/lib/ai/multi-groq';
import type { ShortVideoContext, ShortVideoPlatform } from './video-processor';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface VideoNoteData {
  platform: ShortVideoPlatform;
  videoTitle: string;
  authorName: string;
  thumbnailUrl: string | null;
  noteType: 'english_phrase' | 'cross_language';
  phrase: string;
  explanation: string;
  examples: string[];
  funFact: string | null;
}

const LANG_CODE_TO_NAME: Record<string, string> = {
  uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
  de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
  tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
};

const PLATFORM_LABELS: Record<ShortVideoPlatform, string> = {
  tiktok: 'TikTok',
  shorts: 'YouTube Shorts',
  reels: 'Instagram Reels',
};

const PLATFORM_FALLBACK_PHRASES: Record<ShortVideoPlatform, string> = {
  tiktok: 'viral',
  shorts: 'trending',
  reels: 'aesthetic',
};

// ─── Main generator ────────────────────────────────────────────────────────────

export async function generateVideoNote(
  ctx: ShortVideoContext,
  userNativeLangCode: string,
  userExplanationLang: string, // 'native' | 'english'
): Promise<VideoNoteData> {
  const nativeLang = LANG_CODE_TO_NAME[userNativeLangCode] || 'Ukrainian';
  const explanationLang = userExplanationLang === 'native' ? nativeLang : 'English';
  const platformLabel = PLATFORM_LABELS[ctx.platform];
  const fallbackPhrase = PLATFORM_FALLBACK_PHRASES[ctx.platform];

  const systemPrompt = `You are a language educator and cultural analyst specialising in short-form video content (${platformLabel}) and English linguistics.
Your role: given a video title, author, and optional transcript, identify the single most linguistically interesting or educationally valuable element and create a concise "${platformLabel} Note" card.

Rules:
- If the title/transcript is mostly English: pick the most interesting phrase, idiom, slang, or expression — something genuinely interesting, not obvious.
- If the title/transcript is in another language (or mixed): focus on how this concept/phrase is expressed in English, what's culturally fascinating about the translation, or any faux ami / false cognate potential.
- "noteType": "english_phrase" if content is primarily English, "cross_language" if it's another language.
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
    `Platform: ${platformLabel}`,
    ctx.title ? `Title: "${ctx.title}"` : '',
    ctx.authorName ? `Creator: @${ctx.authorName}` : '',
    ctx.transcription ? `[TRANSCRIPTION]: "${ctx.transcription}"` : '',
    ctx.visionAnalysis ? `[VISUAL DESCRIPTION]: "${ctx.visionAnalysis}"` : '',
  ].filter(Boolean);

  const userPrompt =
    ctxLines.join('\n') +
    `\n\nAnalyze the content of the video based on the data above. If transcription/visual info is missing, provide a fun note about a popular English expression currently used in ${platformLabel} content. Do NOT analyze the URL structure.`;

  const DEFAULT: Omit<VideoNoteData, 'platform' | 'videoTitle' | 'authorName' | 'thumbnailUrl'> = {
    noteType: 'english_phrase',
    phrase: fallbackPhrase,
    explanation: `Could not generate note for this ${platformLabel} video.`,
    examples: [],
    funFact: null,
  };

  try {
    const raw = await makeAICompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 512,
      responseFormat: { type: 'json_object' },
      timeoutMs: 12_000,
    });

    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      platform: ctx.platform,
      videoTitle: ctx.title || '',
      authorName: ctx.authorName || '',
      thumbnailUrl: ctx.thumbnailUrl,
      noteType: parsed.noteType === 'cross_language' ? 'cross_language' : 'english_phrase',
      phrase: parsed.phrase || fallbackPhrase,
      explanation: parsed.explanation || '',
      examples: Array.isArray(parsed.examples) ? parsed.examples.slice(0, 3) : [],
      funFact: parsed.funFact || null,
    };
  } catch {
    return {
      platform: ctx.platform,
      videoTitle: ctx.title || '',
      authorName: ctx.authorName || '',
      thumbnailUrl: ctx.thumbnailUrl,
      ...DEFAULT,
    };
  }
}
