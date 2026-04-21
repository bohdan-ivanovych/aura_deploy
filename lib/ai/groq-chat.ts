import { makeAICompletion } from './multi-groq';
import { 
  INJECTION_GUARD,
  sanitizeUserInput,
  buildConversationXml,
  buildPromptReminder,
} from './prompt-guard';
import { FullTikTokContext } from '@/lib/ai/tiktok-processor';

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

After writing your chat reply, silently analyze the user's LAST message for errors.

grammarCorrection rules:
- null if no obvious grammatical error (silence > false positives).
- NEVER copy your conversational reply text here.
- If an error exists, you MUST use EXACTLY this format (single line): "❌ [wrong phrase] → ✅ [correct phrase] — [brief rule in [EXPLANATION_LANGUAGE]]"
- Example: "❌ I have went → ✅ I have gone — present perfect requires past participle"
- Only flag the SINGLE most obvious error. Skip stylistic variants.

errorSpan: {"original": "exact wrong words from user", "corrected": "fixed version"} or null
weaknessIdentified: one canonical tag from this list ONLY:
  present simple | past simple | present perfect | past perfect | future tense |
  continuous aspect | modal verbs | conditionals | passive voice | gerund vs infinitive |
  third person -s | irregular verbs | auxiliary verbs | word order | subject-verb agreement |
  articles | countable nouns | prepositions of time | prepositions of place | prepositions |
  pronouns | comparatives | double negative | false cognate | vocabulary | collocation
  (If the mistake is grammatical, DO NOT select 'vocabulary'. Select the exact grammar rule. Only use 'vocabulary' for pure wrong word choices).
  (Or null if no error)

strengthIdentified: brief praise of a genuinely strong construction, or null
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
  "bubbles": ["your chat message here"],
  "grammarCorrection": null,
  "weaknessIdentified": null,
  "errorSpan": null,
  "strengthIdentified": null,
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
  suggestion?: string | null;
  levelAdjustment?: number;
  errorSpan?: { original: string; corrected: string } | null;
  vocabScore?: number;
  complexityScore?: number;
  fluencyScore?: number;
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
  memoryContext?: string; // Optional long-term memory injection
  activeQuests?: Array<{ id: string; title: string; description: string }>;
  isTikTok?: boolean; // Suppresses grammar analysis
  tiktokContext?: FullTikTokContext | null;
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
  isTikTok = false,
  tiktokContext = null,
  stealthTargets = null,
}: GenerateChatParams): Promise<{ bubbles: string[]; parsedMeta: Partial<AIResponse> }> {
  const explanationLang = userRecord.explanationLanguage === 'native'
    ? (userRecord.nativeLanguage || 'English')
    : 'English';

  const questsStr = activeQuests.length > 0
    ? `\nACTIVE QUESTS FOR THIS USER:\n${activeQuests.map(q => `- UUID: ${q.id} | Title: "${q.title}" | Task: ${q.description}`).join('\n')}\nIf the user successfully completes any of these tasks in their latest message, add the UUID to 'completedQuestIds' array.`
    : '';

  const systemPromptStr = [
    INJECTION_GUARD,
    '',
    memoryContext, // long-term memory injected before persona
    reactionInject,
    persona.systemPrompt
      ? `PERSONA: ${persona.systemPrompt}`
      : `PERSONA: You are ${persona.name}, a confident, witty person with strong opinions.`,
    `Native language of user: ${userRecord.nativeLanguage || 'English'}`,
    `[EXPLANATION_LANGUAGE] = ${explanationLang}`,
    `User depth level: ${userRecord.diveDepth ?? 0}/200`,
    weaknessSummary,
    questsStr,
    isTikTok
      ? `[SYSTEM — TIKTOK CONTEXT]: User shared a TikTok video.
${tiktokContext?.title ? `Title: "${tiktokContext.title}"` : ''}
${tiktokContext?.authorName ? `Creator: @${tiktokContext.authorName}` : ''}
${tiktokContext?.transcription ? `[VIDEO AUDIO TRANSCRIPT]:\n"${tiktokContext.transcription}"\n` : ''}
${tiktokContext?.visionAnalysis ? `[VIDEO VISUAL DESCRIPTION]:\n"${tiktokContext.visionAnalysis}"\n` : ''}
${(!tiktokContext?.transcription && !tiktokContext?.visionAnalysis) ? '(No audio transcription or visual description available. React naturally as if you saw a generic video by this creator).' : ''}
React to the CONTENT AND TOPIC of this multimodal data as your persona. Engage with what actually happens/is said in the video. Be emotional, funny, or provocative in character. grammarCorrection MUST be null. ZERO teacher-speak.`
      : '',
    SYSTEM_PROMPT
      .replace(/\[PERSONA_NAME\]/g, persona.name)
      .replace(/\[EXPLANATION_LANGUAGE\]/g, explanationLang),
  ].filter(Boolean).join('\n');

  const safeUserText = sanitizeUserInput(text);
  const conversationXml = buildConversationXml(history as any);
  const reminder = buildPromptReminder(persona.name);
  const userPrompt = `${conversationXml}\n\n<user_message>${safeUserText}</user_message>${reminder}`;

  const rawContent = await makeAICompletion({
    messages: [
      { role: 'system', content: systemPromptStr },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.80,
    maxTokens: MAX_COMPLETION_TOKENS,
    responseFormat: { type: 'json_object' },
    timeoutMs: 20_000,
  });

  const { bubbles, meta: parsedMeta } = parseAIReply(rawContent);

  // Ensure completedQuestIds is an array
  if (parsedMeta.completedQuestIds && !Array.isArray(parsedMeta.completedQuestIds)) {
    parsedMeta.completedQuestIds = [];
  }

  return { bubbles, parsedMeta };
}
