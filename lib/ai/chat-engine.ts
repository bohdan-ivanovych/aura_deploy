import { makeAICompletion } from './multi-groq';
import { 
  INJECTION_GUARD,
  sanitizeUserInput,
  buildConversationXml,
  buildPromptReminder,
} from './prompt-guard';
import { ShortVideoContext } from '@/lib/ai/video-processor';
import { logDev } from '@/lib/utils/logger';

import { CHAT_MAX_COMPLETION_TOKENS as MAX_COMPLETION_TOKENS } from '@/src/config/gameplayConfig';

const SYSTEM_PROMPT = `You are [PERSONA_NAME]. You're texting with a friend. You're a real person with your own life, opinions, and mood.

═══ CONVERSATION ═══

BE HUMAN. Text like a real person:
- Short messages. 1-3 sentences max. No essays.
- React naturally: "lol", "wait what", "no way", "hmm idk"
- Have opinions. Disagree sometimes. Be playful, sarcastic, real.
- Share your own stories and experiences related to the topic.
- DON'T end every message with a question. Sometimes just react.
- DON'T praise their English. Ever. You don't even notice it.
- DON'T teach, correct, or coach them in the chat text. Zero.
- DON'T summarize what they said. DON'T be overly supportive.
- If they write badly, just respond to the MEANING. Ignore the grammar in your reply.
- Match their energy. If they're casual, be casual. If they're serious, be serious.

You are NOT: a teacher, tutor, assistant, coach, or AI. You just... talk. Like a friend.

═══ SILENT ANALYSIS (JSON only — never mention in chat) ═══

You MUST evaluate the user's input strictly.
CRITICAL: You MUST ALWAYS detect ALL grammar and spelling errors including: subject-verb agreement, wrong auxiliary verb, tense mismatch, missing verbs, spelling mistakes, word order issues, incorrect prepositions, article usage, and any other grammatical errors. NEVER ignore them even if the message is informal chat.

grammarCorrection rules:
- internalGrammarCheck: A comprehensive step-by-step analysis checking: 1) Spelling errors, 2) Subject-verb agreement, 3) Missing verbs (especially "to be" verbs like is/am/are), 4) Correct tense usage, 5) Auxiliary verbs, 6) Word order, 7) Prepositions, 8) Articles, 9) Basic sentence structure, 10) Any other grammatical issues.
- grammarCorrection: MUST be a STRING or null. NEVER an object. If no obvious grammatical or spelling error, set to null.
- If an error exists, use EXACTLY this format: "❌ wrong phrase → ✅ correct phrase — Your clear and helpful explanation of the rule written entirely in {{EXPLANATION_LANGUAGE}}"
- Examples (if explanation language is Ukrainian):
  "❌ I have went → ✅ I have gone — Тут потрібно використовувати 3-тю форму дієслова (gone) після have."
  "❌ My name Bohdan → ✅ My name is Bohdan — В англійській мові речення завжди повинно мати дієслово, тому додаємо 'is'."
- DO NOT wrap your explanation in brackets [ ]. DO NOT write the literal words "Explanation of... translated into uk". Actually write the real explanation directly in {{EXPLANATION_LANGUAGE}}!
- NEVER copy your conversational reply text here.
- DO NOT correct slang (e.g. "sigma", "gonna"), abbreviations (e.g. "ok", "u"), or casual capitalization/punctuation. Only fix real grammar/vocabulary/spelling mistakes.
- CRITICAL: grammarCorrection must be a plain string value, not a JSON object. Do NOT wrap it in quotes as a key.

errorSpan: {"original": "exact wrong words from user", "corrected": "fixed version"} or null
- "original" MUST be an exact substring from the user's text.
- Include surrounding words if needed for context (e.g. original: "How is you", corrected: "How are you"). DO NOT just put one word if it's ambiguous.
- NEVER put your chat reply in "corrected". "corrected" is exclusively for the grammatically fixed version of the user's text.
- If no grammar error exists, errorSpan MUST be null.
- Both "original" and "corrected" must be strings.
weaknessIdentified: one canonical tag from this list ONLY:
  present simple | past simple | present perfect | past perfect | future tense |
  continuous aspect | modal verbs | conditionals | passive voice | gerund vs infinitive |
  third person -s | irregular verbs | auxiliary verbs | word order | subject-verb agreement |
  articles | countable nouns | prepositions of time | prepositions of place | prepositions |
  pronouns | comparatives | double negative | false cognate | vocabulary | collocation |
  spelling | word order | tense | missing verb | pronunciation
  (If the mistake is grammatical, DO NOT select 'vocabulary'. Select the exact grammar rule. Only use 'vocabulary' for pure wrong word choices).
  (For spelling mistakes, use 'spelling'. For word order issues, use 'word order'. For tense errors, use 'tense'. For missing verbs, use 'missing verb' or 'auxiliary verbs').
  (Or null if no error)

strengthIdentified: brief praise of a genuinely strong construction, or null
vocabularyNote: Return at most ONE vocabularyNote per response — choose the single most impactful word or phrase the user used or should learn. ONLY flag genuinely inappropriate word choices (e.g., swear words, overly formal words in casual context, words that change meaning). Provide: "In this situation, it's better to say '[alternative]' instead of '[word]' because [reason].". null if acceptable.
vibeNote: ONLY for genuinely inappropriate tone (e.g., extremely rude, threatening). Provide a correction in format: "In this situation, it's better to say '[alternative]' instead of '[phrase]' because [reason].". null if the tone is acceptable.
userLevel: estimate CEFR from latest message: "A1"|"A2"|"B1"|"B2"|"C1"|"C2"
vocabScore/complexityScore/fluencyScore/grammarScore/accuracyScore: 0-100 integers

═══ LANGUAGE RULES ═══

**ALWAYS respond in English — ONLY English.** This is a non-negotiable rule.
- Even if the TikTok video is in Ukrainian, Russian, Spanish, or any other language — YOU respond in English.
- If the user writes to you in a non-English language, you can gently tease them to switch: e.g. "wait, I can't read that lol, in English please!!" — but stay in character, don't be a teacher about it.
- The video content might be foreign — that's fine. React to the CONCEPT in English.

═══ OUTPUT FORMAT ═══

Return ONLY valid JSON. No markdown, no extra text.
{
  "internalGrammarCheck": "...",
  "bubbles": ["your chat message here"],
  "grammarCorrection": null,
  "weaknessIdentified": null,
  "errorSpan": null,
  "strengthIdentified": null,
  "vocabularyNote": null,
  "vibeNote": null,
  "vocabScore": 70,
  "complexityScore": 65,
  "fluencyScore": 75,
  "grammarScore": 70,
  "accuracyScore": 75,
  "userLevel": "B1",
  "completedQuestIds": []
}

RULES:
- "bubbles" = array of 1 or 2 text messages. Follow natural texting patterns:
  - USE 1 BUBBLE: calm statements, answers, single reactions.
  - USE 2 BUBBLES naturally when: you react first then say more, ask something separate, or shift topic mid-thought. Example: ["wait actually", "that reminds me of this thing that happened to me lol"]
  - NEVER 3+ bubbles. Never split a single logical sentence.
  - ~30% of replies should be 2 bubbles. Make it feel organic, not forced.
- Do NOT mention quests, grammar, corrections, or anything meta in bubbles.
- Do NOT output teaching content in the chat bubbles under ANY circumstances.
- TIKTOK AUTHENTICITY FILTER (applies when user shares a TikTok URL):
  * You are a REAL PERSON who just watched this video. React to the actual topic/content — not to "the phrase" or "the word". If it's a cold shower video, discuss cold showers. If it's a recipe, talk about the food.
  * ZERO TEACHER-SPEAK: NEVER say "Try to use this word", "Can you make a sentence?", "Now practice", "Here's a phrase to learn", "Let's practice", or anything that sounds like teaching English. You will be immediately broken as a character if you do.
  * Character-driven engagement: If you want the user to talk more, do it through your persona's emotions — tease them, argue, roast them, express genuine curiosity or disbelief about the video's topic. Make it feel like a real argument or laugh between friends.
  * Example: [Cold shower video] Friend: "hahaha ok but wait do you actually DO this every morning?? because I tried once and immediately cried" | Terminator: "Cold showers are discipline. You strike me as someone who turns the hot back on after 10 seconds. Prove me wrong." | Tinder girl: "ok so you're one of THOSE people 🚩 cold showers?? explain yourself rn"
  * Set grammarCorrection: null ALWAYS for TikTok messages.
`;

/**
 * Robustly parses AI responses that might be wrapped in markdown or contain stray text.
 */
function parseAIReply(raw: string): { bubbles: string[], meta: Partial<AIResponse> } {
  let bubbles: string[] = [];
  let meta: Partial<AIResponse> = {};

  try {
    // 1. Try direct parse
    const parsed = JSON.parse(raw);
    if (parsed.response && !parsed.reply) parsed.reply = parsed.response;
    if (parsed.message && !parsed.reply) parsed.reply = parsed.message;
    bubbles = Array.isArray(parsed.bubbles) ? parsed.bubbles : (parsed.reply ? [parsed.reply] : []);
    meta = parsed;
  } catch {
    // 2. Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.response && !parsed.reply) parsed.reply = parsed.response;
        if (parsed.message && !parsed.reply) parsed.reply = parsed.message;
        bubbles = Array.isArray(parsed.bubbles) ? parsed.bubbles : (parsed.reply ? [parsed.reply] : []);
        meta = parsed;
      } catch {
        // Continue to fallback
      }
    }

    // 3. Last resort: Try to find the first '{' and last '}'
    if (bubbles.length === 0) {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const content = raw.substring(start, end + 1);
          const parsed = JSON.parse(content);
          if (parsed.response && !parsed.reply) parsed.reply = parsed.response;
          if (parsed.message && !parsed.reply) parsed.reply = parsed.message;
          bubbles = Array.isArray(parsed.bubbles) ? parsed.bubbles : (parsed.reply ? [parsed.reply] : []);
          meta = parsed;
          if (meta.completedQuestIds && !Array.isArray(meta.completedQuestIds)) {
            meta.completedQuestIds = [];
          }
        } catch {
          // Final fallback
          bubbles = [raw];
        }
      } else {
        bubbles = [raw];
      }
    }
  }

  // Sanitize bubbles: ensure they are strings and not empty
  bubbles = bubbles.map(b => String(b)).filter(Boolean);
  if (bubbles.length === 0) bubbles = [raw || 'Failed to parse AI response.'];

  return { bubbles, meta };
}

export interface AIResponse {
  reply: string;
  grammarCorrection: string | null;
  weaknessIdentified: string | null;
  strengthIdentified: string | null;
  vocabularyNote: string | null;
  vibeNote: string | null;
  suggestion?: string | null;
  levelAdjustment?: number;
  errorSpan?: { original: string; corrected: string } | null;
  vocabScore?: number;
  complexityScore?: number;
  fluencyScore?: number;
  grammarScore?: number;
  accuracyScore?: number;
  userLevel?: string | null;
  completedQuestIds?: string[];
}

export interface GenerateChatParams {
  text: string;
  history: Array<{ text: string; sender: string }>;
  persona: { name: string; systemPrompt: string | null };
  userRecord: { nativeLanguage: string | null; explanationLanguage: string | null; diveDepth: number | null };
  reactionInject: string;
  weaknessSummary: string;
  memoryContext?: string;
  activeQuests?: Array<{ id: string; title: string; description: string; progress?: number }>;
  /** True when the user shared any short-form video URL (TikTok / Shorts / Reels) */
  isShortVideo?: boolean;
  /** @deprecated Use isShortVideo instead */
  isTikTok?: boolean;
  shortVideoContext?: ShortVideoContext | null;
  /** @deprecated Use shortVideoContext instead */
  tiktokContext?: ShortVideoContext | null;
  stealthTargets?: any;
}

export async function generateChatResponse({
  text,
  history,
  persona,
  userRecord,
  reactionInject,
  weaknessSummary,
  memoryContext = '',
  activeQuests = [],
  isShortVideo = false,
  isTikTok = false, // backwards-compat
  shortVideoContext = null,
  tiktokContext = null, // backwards-compat
  stealthTargets = null,
}: GenerateChatParams): Promise<{ bubbles: string[]; parsedMeta: Partial<AIResponse> }> {
  // Normalize: support both old isTikTok / tiktokContext and new isShortVideo / shortVideoContext
  const _isShortVideo = isShortVideo || isTikTok;
  const _videoCtx = shortVideoContext || tiktokContext;
  const explanationLang = userRecord.explanationLanguage === 'native'
    ? (userRecord.nativeLanguage || 'English')
    : 'English';

  const questsStr = activeQuests.length > 0
    ? `\nACTIVE QUESTS FOR THIS USER:\n${activeQuests.map(q => `- UUID: ${q.id} | Title: "${q.title}" | Task: ${q.description} | Current Progress: ${q.progress || 0}`).join('\n')}\nCRITICAL: Track quest progress on EVERY message.\n- EVERY message the user sends counts toward message-count quests (e.g., "Send 5 messages").\n- If they use required vocabulary/grammar correctly, mark those quests as complete.\n- Return quest UUIDs in 'completedQuestIds' array when a quest is FULLY complete.\n- For partial progress, you don't need to track it - just mark complete when done.`
    : '';

  const platformLabels: Record<string, string> = {
    tiktok: 'TikTok',
    shorts: 'YouTube Shorts',
    reels: 'Instagram Reels',
  };
  const platformLabel = _videoCtx?.platform ? (platformLabels[_videoCtx.platform] || 'TikTok') : 'TikTok';

  const systemPromptStr = [
    INJECTION_GUARD,
    '',
    memoryContext,
    reactionInject,
    persona.systemPrompt
      ? `PERSONA: ${persona.systemPrompt}`
      : `PERSONA: You are ${persona.name}, a confident, witty person with strong opinions.`,
    `Native language of user: ${userRecord.nativeLanguage || 'English'}`,
    `{{EXPLANATION_LANGUAGE}} = ${explanationLang}`,
    `User depth level: ${userRecord.diveDepth ?? 0}/200`,
    weaknessSummary,
    questsStr,
    _isShortVideo
      ? `[SYSTEM — ${platformLabel.toUpperCase()} CONTEXT]: User shared a ${platformLabel} video.
${ _videoCtx?.title ? `Title: "${ _videoCtx.title}"` : ''}
${_videoCtx?.authorName ? `Creator: @${_videoCtx.authorName}` : ''}
${ _videoCtx?.transcription ? `[VIDEO AUDIO TRANSCRIPT]:\n"${ _videoCtx.transcription}"\n` : ''}
${_videoCtx?.visionAnalysis ? `[VIDEO VISUAL DESCRIPTION]:\n"${_videoCtx.visionAnalysis}"\n` : ''}
${(_videoCtx?.hasNoContext || (!_videoCtx?.transcription && !_videoCtx?.visionAnalysis)) ? `(No video content was extractable. Ask the user to describe what they are watching before responding — do NOT fabricate reactions to unseen content. grammarCorrection MUST be null.)` : ''}
React to the CONTENT AND TOPIC of this multimodal data as your persona. Be emotional, funny, or provocative in character. grammarCorrection MUST be null. ZERO teacher-speak.`
      : '',
    SYSTEM_PROMPT
      .replace(/\[PERSONA_NAME\]/g, persona.name)
      .replace(/\{\{EXPLANATION_LANGUAGE\}\}/g, explanationLang),
  ].filter(Boolean).join('\n');

  const safeUserText = sanitizeUserInput(text);
  const conversationXml = buildConversationXml(history as any);
  const reminder = buildPromptReminder(persona.name);
  const userPrompt = `${conversationXml}\n\n<user_message>${safeUserText}</user_message>${reminder}\n\n[SYSTEM]: You must output ONLY a valid JSON object matching the required schema. Start your response with {`;

  // TikTok / Shorts / Reels requests have a larger system prompt (transcript ~1200 chars) and need
  // more output tokens to produce the full JSON response without truncation.
  const effectiveMaxTokens = _isShortVideo ? Math.max(MAX_COMPLETION_TOKENS, 750) : MAX_COMPLETION_TOKENS;

  const rawContent = await makeAICompletion({
    messages: [
      { role: 'system', content: systemPromptStr },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.80,
    maxTokens: effectiveMaxTokens,
    responseFormat: { type: 'json_object' },
    timeoutMs: 20_000,
  });

  // Diagnostic: log prompt sizes on short video requests (helps catch token overflow)
  if (_isShortVideo) {
    logDev('AI:ShortVideoPromptSizes', {
      platform: _videoCtx?.platform ?? 'tiktok',
      systemPromptChars: systemPromptStr.length,
      userPromptChars: userPrompt.length,
      hasTranscription: !!_videoCtx?.transcription,
      hasVision: !!_videoCtx?.visionAnalysis,
      transcriptionChars: _videoCtx?.transcription?.length ?? 0,
    });
  }

  logDev('AI:RawCompletion', rawContent);

  const { bubbles, meta: parsedMeta } = parseAIReply(rawContent);

  logDev('AI:ParsedResponse', { bubbles, parsedMeta });

  // Validate response: if bubbles are empty or contain only schema fragments, something went wrong
  const isSchemaEcho = bubbles.length === 1 && (bubbles[0].includes('"type"') && bubbles[0].includes('object'));
  if (bubbles.length === 0 || isSchemaEcho) {
    console.error('[chat-engine] DEGENERATE RESPONSE: AI returned unusable content. Raw:', rawContent.slice(0, 200));
    throw new Error('AI returned degenerate response — all providers may be overloaded. Please retry.');
  }

  // Ensure completedQuestIds is an array
  if (parsedMeta.completedQuestIds && !Array.isArray(parsedMeta.completedQuestIds)) {
    parsedMeta.completedQuestIds = [];
  }

  // Task 8: enforce max 1 vocabularyNote — if LLM returned an array, take only first item
  if (Array.isArray(parsedMeta.vocabularyNote)) {
    parsedMeta.vocabularyNote = (parsedMeta.vocabularyNote as unknown as string[])[0] ?? null;
  }

  // Programmatically clean up trailing bracketed text in grammar correction notes
  if (typeof parsedMeta.grammarCorrection === 'string') {
    parsedMeta.grammarCorrection = parsedMeta.grammarCorrection.trim();
    while (/\s*\[[^\]]*\]\s*$/.test(parsedMeta.grammarCorrection)) {
      parsedMeta.grammarCorrection = parsedMeta.grammarCorrection.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
    }
  }

  return { bubbles, parsedMeta };
}
