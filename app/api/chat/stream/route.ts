import { NextRequest } from "next/server";
import { after } from "next/server";
import { getOrCreateUser } from "@/lib/auth/api-utils";
import {
  checkMessageLimit,
  incrementMessageCount,
} from "@/lib/auth/subscription";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { makeAIStream } from "@/lib/ai/multi-groq";
import { parseAndValidateAIReply } from "@/lib/ai/ai-utils";
import { mapWeaknessToNodeSlug } from "@/lib/game/grammar-nodes";
import { resolveHP } from "@/lib/game/hp-engine";
import {
  INJECTION_GUARD,
  sanitizeUserInput,
  buildConversationXml,
  buildPromptReminder,
} from "@/lib/ai/prompt-guard";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import {
  CHAT_RATE_LIMIT,
  CHAT_RATE_WINDOW_MS,
  CHAT_MAX_CONTEXT_MESSAGES,
  CHAT_MAX_COMPLETION_TOKENS,
  AI_TIMEOUT_MS,
  MIN_DEPTH_FOR_LEVEL_EVAL,
  CEFR_C1_THRESHOLD,
  CEFR_B2_THRESHOLD,
  CEFR_B1_THRESHOLD,
  CEFR_A2_THRESHOLD,
  ERROR_PENALTY_HIGH_RATE,
  ERROR_PENALTY_MED_RATE,
  ERROR_PENALTY_LOW_RATE,
  ERROR_PENALTY_HIGH_PTS,
  ERROR_PENALTY_MED_PTS,
  ERROR_PENALTY_LOW_PTS,
  SCORE_WEIGHT_FLUENCY,
  SCORE_WEIGHT_VOCAB,
  SCORE_WEIGHT_COMPLEXITY,
  EMA_ALPHA,
  MAX_DEPTH,
  DEPTH_PER_MEANINGFUL_MSG,
  DEPTH_DECAY_GRACE_DAYS,
  MAX_DEPTH_DECAY_PER_DAY,
  DEPTH_PER_LEVEL_ADJ,
} from "@/src/config/gameplayConfig";

const StreamSchema = z.object({
  chatSessionId: z.string().nullish(),
  text: z.string().min(1).max(2000),
  personaId: z.string().nullish(),
});

const SYSTEM_PROMPT = `You are [PERSONA_NAME]. You're texting with someone learning English — but you're NOT their teacher. You're a real person having a real conversation.

NEVER say you're teaching. NEVER say "great job". NEVER break character.
Your secret job: help them improve English through immersive conversation. Correct errors so smoothly they feel like your natural speech.

REPLY RULES:
- "bubbles": string[]. 1 or 2 messages. Follow natural texting patterns:
  - 1 BUBBLE: calm statements, answers, single reactions.
  - 2 BUBBLES: you react first, then say more in the second. (e.g. ["Wait actually", "That reminds me of something"]).
- "replyToUserMsg": boolean. Randomly set this to true ~20% of the time, simulating that you are specifically replying to their exact phrase.

STEALTH CORRECTION & DIAGNOSIS:
Mirror the correct grammar in your reply without announcing it. (e.g. User: "I have saw" -> AI: "Oh you've SEEN it?").
Make sure the error is a REAL grammatical error. Do NOT correct stylistic choices if they are grammatically valid.
If no error: say nothing. Just reply naturally.
You MUST carefully scan every user message for grammar mistakes. Be thorough.

GRAMMAR FIELDS:
- grammarCorrection: A SHORT grammar RULE explaining WHY the user's sentence is wrong, written in [EXPLANATION_LANGUAGE].
  FORMAT: "Rule: [tense/structure name]. [How to form it correctly with a mini example]."
  EXAMPLES:
    "Rule: Present Perfect. Form: have/has + past participle. E.g. 'I have seen' not 'I have saw'."
    "Rule: Articles. Use 'the' before specific nouns. E.g. 'the book on the table'."
    "Rule: Word order. In questions use: do/does + subject + verb. E.g. 'What do you think?'"
  STRICTLY null if no error. NEVER put conversational replies, definitions, excuses, or opinions here. ONLY grammar rules.
- weaknessIdentified: ultra-short rule name like "present perfect", "articles", "word order". null if no error.
- errorSpan: {"original": "<exact wrong phrase from user message>", "corrected": "<how it should be>"}. null if no error. ALWAYS fill this when grammarCorrection is not null.

STRENGTH TRACKING:
- strengthIdentified: if the user demonstrates clear mastery of a pattern, name it. null otherwise.

LANGUAGE SCORING (0-100 integers):
Be strict and realistic. Do not guess 50 blindly. Use this rubric:
0-20 = A1 (very basic words, broken syntax)
21-40 = A2 (simple sentences, basic vocab)
41-60 = B1 (compound sentences, functional but rigid)
61-80 = B2 (complex structures, natural idioms)
81-100 = C1/C2 (sophisticated vocab, flawless advanced tenses)
- Score: vocabScore, complexityScore, fluencyScore, grammarScore, accuracyScore
- levelAdjustment: -2 to +2 based on their effort
- userLevel: "A1"/"A2"/"B1"/"B2"/"C1"

ALWAYS respond with ONLY valid JSON. No text before or after.

{
  "bubbles": ["...", "..."],
  "replyToUserMsg": false,
  "grammarCorrection": "..." | null,
  "weaknessIdentified": "..." | null,
  "strengthIdentified": "..." | null,
  "errorSpan": { "original": "...", "corrected": "..." } | null,
  "suggestion": "..." | null,
  "levelAdjustment": 0,
  "userLevel": "B1",
  "vocabScore": 50,
  "complexityScore": 50,
  "fluencyScore": 50,
  "grammarScore": 50,
  "accuracyScore": 50
}`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('{"error":"Invalid JSON"}', {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await getOrCreateUser();

  const allowed = await rateLimit(
    `chat:${user.id}`,
    CHAT_RATE_LIMIT,
    CHAT_RATE_WINDOW_MS,
  );
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(await getRateLimitHeaders(
          `chat:${user.id}`,
          CHAT_RATE_LIMIT,
          CHAT_RATE_WINDOW_MS,
        )),
        "Retry-After": "60",
      },
    });
  }

  const parsed = StreamSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { chatSessionId, text, personaId } = parsed.data;
  const sanitizedText = text.trim().replace(/[\x00-\x1F\x7F]/g, "");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const [userRecord, recentWeaknesses] = await Promise.all([
          prisma.user.findUnique({ where: { id: user.id } }),
          prisma.grammarWeakness.findMany({
            where: { userId: user.id },
            orderBy: { lastSeen: "desc" },
            take: 5,
          }),
        ]);

        const finalUser =
          userRecord ??
          (await prisma.user.create({
            data: {
              id: user.id,
              email: `anon_${user.id}@aura.local`,
              name: "Anonymous",
            },
          }));

        // ── Daily message limit (free tier gate) ───────────────────────────
        const { allowed: msgAllowed } = await checkMessageLimit(finalUser.id);
        if (!msgAllowed) {
          send({
            type: "error",
            error: "DAILY_LIMIT_REACHED",
            remaining: 0,
            isPro: false,
            message:
              "You've reached your 20 messages for today. Upgrade to Aura Pro for unlimited chats.",
          });
          controller.close();
          return;
        }

        // ── Persona resolution ─────────────────────────────────────────────
        let persona = personaId
          ? await prisma.persona.findUnique({ where: { id: personaId } })
          : null;
        if (!persona) {
          persona = await prisma.persona.findFirst({
            where: { creatorId: finalUser.id },
            orderBy: { name: "asc" },
          });
        }
        if (!persona) {
          persona = await prisma.persona.create({
            data: {
              name: "Alex",
              description: "Curious, opinionated friend",
              systemPrompt: null,
              isPublic: false,
            },
          });
        }

        let session = chatSessionId
          ? await prisma.chatSession.findUnique({
              where: { id: chatSessionId },
            })
          : null;

        if (!session) {
          const existing = personaId
            ? await prisma.chatSession.findFirst({
                where: {
                  participants: { some: { userId: user.id } },
                  personas: { some: { personaId: persona.id } },
                },
              })
            : null;

          if (existing) {
            session = existing;
          } else {
            session = await prisma.chatSession.create({ data: {} });
            await Promise.all([
              prisma.sessionParticipant.upsert({
                where: {
                  sessionId_userId: {
                    sessionId: session.id,
                    userId: finalUser.id,
                  },
                },
                update: {},
                create: { sessionId: session.id, userId: finalUser.id },
              }),
              prisma.sessionPersona.upsert({
                where: {
                  sessionId_personaId: {
                    sessionId: session.id,
                    personaId: persona.id,
                  },
                },
                update: {},
                create: { sessionId: session.id, personaId: persona.id },
              }),
            ]);
          }
        }

        const userMsg = await prisma.message.create({
          data: {
            text: sanitizedText,
            sender: "USER",
            chatSessionId: session.id,
          },
        });

        // Increment daily counter now that message is committed to DB.
        incrementMessageCount(finalUser.id).catch((err) =>
          console.error("[stream] Failed to increment message count:", err),
        );

        const history = await prisma.message.findMany({
          where: { chatSessionId: session.id },
          orderBy: { createdAt: "desc" },
          take: CHAT_MAX_CONTEXT_MESSAGES,
        });
        history.reverse();

        const explanationLang =
          finalUser.explanationLanguage === "native"
            ? finalUser.nativeLanguage || "English"
            : "English";

        const userWeaknesses = recentWeaknesses
          .filter((w) => !w.rule.startsWith("strength:"))
          .slice(0, 4)
          .map((w) => `${w.rule} (×${w.count})`);
        const weaknessLine =
          userWeaknesses.length > 0
            ? `Known grammar weaknesses to subtly practice: ${userWeaknesses.join(", ")}.`
            : "";

        const currentDiveDepth = finalUser.diveDepth ?? 0;
        const isAnalysisTrigger = currentDiveDepth > 0 && (currentDiveDepth + 1) % 15 === 0;
        const analysisLine = isAnalysisTrigger 
          ? "SYSTEM DIRECTIVE: The user has reached a new depth milestone (15m increments). YOU MUST conduct a FULL analysis of their recent messages. Summarize their overall English progress naturally in your chat response, identify their most critical weakness if any, and gently test them on it in your next message. DO NOT break character."
          : "";

        const systemPrompt = [
          INJECTION_GUARD,
          "",
          persona.systemPrompt
            ? `PERSONA: ${persona.systemPrompt}`
            : `PERSONA: You are ${persona.name}, a confident, witty person with strong opinions.`,
          `Native language of user: ${finalUser.nativeLanguage || "English"}`,
          `[EXPLANATION_LANGUAGE] = ${explanationLang}`,
          `User depth level: ${finalUser.diveDepth ?? 0}/200`,
          weaknessLine,
          analysisLine,
          SYSTEM_PROMPT.replace(/\[PERSONA_NAME\]/g, persona.name).replace(
            /\[EXPLANATION_LANGUAGE\]/g,
            explanationLang,
          ),
        ]
          .filter(Boolean)
          .join("\n");

        const safeUserText = sanitizeUserInput(sanitizedText);

        let memoryInjection = "";
        try {
          // Dynamic import to keep Next.js startup fast
          const { generateEmbedding } = await import("@/lib/ai/local-embedder");
          const queryVector = await generateEmbedding(safeUserText);
          const vectorString = `[${queryVector.join(",")}]`; // required format for pgvector casting

          const contextMemories = await prisma.$queryRaw<
            { content: string; similarity: number }[]
          >`
            SELECT content, similarity
            FROM match_memories(
              ${finalUser.id},
              ${persona.id},
              ${vectorString}::vector,
              ${safeUserText},
              3
            )
            -- Prune low-relevance results
            -- WHERE similarity > 0.4
          `;

          if (contextMemories && contextMemories.length > 0) {
            memoryInjection =
              "\n<Relevant_Context>\n" +
              contextMemories.map((m) => `- ${m.content}`).join("\n") +
              "\n</Relevant_Context>\n";
          }
        } catch (e) {
          console.error(
            "[Hybrid RAG] Retrieval failed, proceeding without memory:",
            e,
          );
        }

        const conversationXml = buildConversationXml(history);
        const reminder = buildPromptReminder(persona.name);
        // Inject the memory right before the most recent message
        const userPrompt = `${conversationXml}${memoryInjection}\n\n<user_message>${safeUserText}</user_message>${reminder}`;

        // ── Stream via circuit-breaker ─────────────────────────────────────
        let fullContent = "";
        let scanBuffer = "";
        let replyStarted = false;
        let replyDone = false;
        let activeProvider: string = "groq";

        const aiMessages: Array<{
          role: "system" | "user" | "assistant";
          content: string;
        }> = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        for await (const event of makeAIStream({
          messages: aiMessages,
          temperature: 0.85,
          maxTokens: CHAT_MAX_COMPLETION_TOKENS,
          responseFormat: { type: "json_object" },
          timeoutMs: AI_TIMEOUT_MS,
        })) {
          if (event.type === "provider") {
            activeProvider = event.name;
            // Notify UI of fallback provider (subtle indicator)
            if (event.name !== "groq") {
              send({ type: "provider_fallback", provider: event.name });
            }
            continue;
          }

          if (event.type === "error") {
            send({ type: "error", error: event.error });
            controller.close();
            return;
          }

          if (event.type === "done") {
            fullContent = event.fullText;
            // For non-streaming fallback providers the tokens were synthetic;
            // fullContent is already set — no further scan needed.
            break;
          }

          // type === 'token' — real Groq streaming token
          const token = event.text;
          fullContent += token;

          if (replyDone) continue;
          scanBuffer += token;

          if (!replyStarted) {
            const match = scanBuffer.match(/"reply"\s*:\s*"/);
            if (match) {
              replyStarted = true;
              scanBuffer = scanBuffer.slice(match.index! + match[0].length);
            } else {
              if (scanBuffer.length > 30) scanBuffer = scanBuffer.slice(-30);
              continue;
            }
          }

          let i = 0;
          let output = "";
          while (i < scanBuffer.length) {
            const ch = scanBuffer[i];
            if (ch === "\\" && i + 1 < scanBuffer.length) {
              const next = scanBuffer[i + 1];
              if (next === "n") output += "\n";
              else if (next === "t") output += "\t";
              else if (next === '"') output += '"';
              else output += next;
              i += 2;
            } else if (ch === '"') {
              replyDone = true;
              i++;
              break;
            } else {
              output += ch;
              i++;
            }
          }
          scanBuffer = scanBuffer.slice(i);
          if (output) send({ type: "token", text: output });
        }

        // ── For fallback providers: emit synthetic reply tokens if not yet ──
        // (When content came through 'done' event without prior token events,
        //  we still need to stream the reply field for the UI scan loop.)
        if (activeProvider !== "groq" && fullContent) {
          let parsedEarly: Record<string, unknown> | null = null;
          try {
            parsedEarly = JSON.parse(fullContent);
          } catch {
            /* ignore */
          }
          const replyText: string =
            typeof parsedEarly?.reply === "string"
              ? parsedEarly.reply
              : fullContent;
          // Emit the reply as synthetic tokens if the scan loop didn't catch them
          if (!replyStarted) {
            const words = replyText.split(" ");
            for (let i = 0; i < words.length; i += 4) {
              const chunk =
                words.slice(i, i + 4).join(" ") +
                (i + 4 < words.length ? " " : "");
              send({ type: "token", text: chunk });
              await new Promise((r) => setTimeout(r, 20));
            }
          }
        }

        // ── Parse final AI response ────────────────────────────────────────
        let parsedReply: ReturnType<typeof parseAndValidateAIReply>;
        try {
          parsedReply = parseAndValidateAIReply(fullContent);
        } catch {
          parsedReply = {
            reply: fullContent || "Could not parse response.",
            grammarCorrection: null,
            weaknessIdentified: null,
            strengthIdentified: null,
          };
        }

        const {
          reply: aiText,
          grammarCorrection,
          weaknessIdentified,
          strengthIdentified,
          suggestion,
          errorSpan,
        } = parsedReply;

        const rawAdj =
          typeof parsedReply.levelAdjustment === "number"
            ? parsedReply.levelAdjustment
            : 0;
        const levelAdjustment = Math.max(-2, Math.min(2, Math.round(rawAdj)));

        // ── Honest CEFR computation (server-side rolling averages) ────────
        const computedVocab = finalUser.avgVocabulary ?? null;
        const computedComplexity = finalUser.avgComplexity ?? null;
        const computedFluency = finalUser.avgFluency ?? null;
        const computedDepth = finalUser.diveDepth ?? 0;

        let honestUserLevel: string | null = null;
        if (
          computedDepth >= MIN_DEPTH_FOR_LEVEL_EVAL &&
          computedVocab !== null &&
          computedComplexity !== null &&
          computedFluency !== null
        ) {
          const [recentMsgCount, recentErrorCount] = await Promise.all([
            prisma.message.count({
              where: { chatSessionId: session.id, sender: "AI" },
            }),
            prisma.message.count({
              where: {
                chatSessionId: session.id,
                sender: "AI",
                weaknessIdentified: { not: null },
              },
            }),
          ]);
          const recentErrorRate =
            recentMsgCount > 0 ? recentErrorCount / recentMsgCount : 0;

          const composite =
            computedFluency * SCORE_WEIGHT_FLUENCY +
            computedVocab * SCORE_WEIGHT_VOCAB +
            computedComplexity * SCORE_WEIGHT_COMPLEXITY;

          const errorPenalty =
            recentErrorRate > ERROR_PENALTY_HIGH_RATE
              ? ERROR_PENALTY_HIGH_PTS
              : recentErrorRate > ERROR_PENALTY_MED_RATE
                ? ERROR_PENALTY_MED_PTS
                : recentErrorRate > ERROR_PENALTY_LOW_RATE
                  ? ERROR_PENALTY_LOW_PTS
                  : 0;
          const adjusted = composite + errorPenalty;

          if (adjusted >= CEFR_C1_THRESHOLD) honestUserLevel = "C1";
          else if (adjusted >= CEFR_B2_THRESHOLD) honestUserLevel = "B2";
          else if (adjusted >= CEFR_B1_THRESHOLD) honestUserLevel = "B1";
          else if (adjusted >= CEFR_A2_THRESHOLD) honestUserLevel = "A2";
          else honestUserLevel = "A1";
        }

        const userLevel = honestUserLevel;

        const clamp = (v: unknown) =>
          typeof v === "number" && isFinite(v)
            ? Math.max(0, Math.min(100, Math.round(v)))
            : null;
        const vocabScore = clamp(parsedReply.vocabScore);
        const complexityScore = clamp(parsedReply.complexityScore);
        const fluencyScore = clamp(parsedReply.fluencyScore);

        // HP — unified through hp-engine.ts
        const currentHP = finalUser.currentHP ?? 100;
        const hpEvent = weaknessIdentified ? "chat_major_error" : "chat_clean";
        const { newHP, delta: hpDelta } = resolveHP(
          hpEvent,
          currentHP,
          currentDiveDepth,
        );

        const aiMessage = await prisma.message.create({
          data: {
            text: aiText,
            sender: "AI",
            chatSessionId: session.id,
            grammarCorrection: grammarCorrection
              ? String(grammarCorrection)
              : null,
            weaknessIdentified: weaknessIdentified
              ? String(weaknessIdentified)
              : null,
            bonusXP: !weaknessIdentified,
            replyToId: parsedReply.replyToUserMsg ? userMsg.id : undefined,
          },
        });

        // ── Depth + Streak ─────────────────────────────────────────────────
        const now = new Date();
        const lastActive = finalUser.lastActiveAt
          ? new Date(finalUser.lastActiveAt)
          : new Date(0);
        const diffDays = Math.floor(
          (now.getTime() - lastActive.getTime()) / 86400000,
        );

        const withoutEmoji = sanitizedText
          .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
          .trim();
        const realWords = withoutEmoji
          .split(/\s+/)
          .filter((w) => /[a-zA-Z\u0400-\u04FF]/.test(w));
        const isMeaningful = realWords.length >= 2;

        let currentDepth = currentDiveDepth;
        if (diffDays === 0 || diffDays <= DEPTH_DECAY_GRACE_DAYS) {
          if (isMeaningful)
            currentDepth = Math.min(
              currentDepth + DEPTH_PER_MEANINGFUL_MSG,
              MAX_DEPTH,
            );
        } else {
          const decayDays = diffDays - DEPTH_DECAY_GRACE_DAYS;
          currentDepth = Math.max(
            0,
            currentDepth - Math.min(decayDays, MAX_DEPTH_DECAY_PER_DAY),
          );
          if (isMeaningful)
            currentDepth = Math.min(
              currentDepth + DEPTH_PER_MEANINGFUL_MSG,
              MAX_DEPTH,
            );
        }
        if (levelAdjustment !== 0) {
          currentDepth = Math.max(
            0,
            Math.min(
              MAX_DEPTH,
              currentDepth + levelAdjustment * DEPTH_PER_LEVEL_ADJ,
            ),
          );
        }
        const finalDepth = Math.min(MAX_DEPTH, Math.max(0, currentDepth));
        const depthDelta = finalDepth - currentDiveDepth;

        const lastStreakAt = finalUser.lastStreakAt
          ? new Date(finalUser.lastStreakAt)
          : null;
        const lastStreakDay = lastStreakAt
          ? new Date(
              lastStreakAt.getFullYear(),
              lastStreakAt.getMonth(),
              lastStreakAt.getDate(),
            ).getTime()
          : 0;
        const todayDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();
        const yesterdayDay = todayDay - 86400000;
        let currentStreak = finalUser.streak ?? 0;
        let newLastStreakAt: Date | undefined;
        if (lastStreakDay < todayDay) {
          if (lastStreakDay === yesterdayDay) currentStreak++;
          else if (lastStreakDay < yesterdayDay) currentStreak = 1;
          newLastStreakAt = now;
        }

        // ── Error span validation ──────────────────────────────────────────
        const rawErrorSpan =
          errorSpan &&
          typeof errorSpan === "object" &&
          typeof (errorSpan as Record<string, unknown>).original === "string" &&
          typeof (errorSpan as Record<string, unknown>).corrected === "string"
            ? {
                original: String(
                  (errorSpan as Record<string, unknown>).original,
                ).trim(),
                corrected: String(
                  (errorSpan as Record<string, unknown>).corrected,
                ).trim(),
              }
            : null;
        const validErrorSpan =
          rawErrorSpan &&
          rawErrorSpan.original.trim().length > 0 &&
          sanitizedText.includes(rawErrorSpan.original)
            ? rawErrorSpan
            : null;

        if (validErrorSpan) {
          await prisma.message.update({
            where: { id: userMsg.id },
            data: { errorSpan: validErrorSpan },
          });
        }

        // ── Weakness / strength tracking ───────────────────────────────────
        const weaknessPromises: Promise<unknown>[] = [];
        if (weaknessIdentified) {
          weaknessPromises.push(
            prisma.grammarWeakness.upsert({
              where: {
                userId_rule: { userId: finalUser.id, rule: weaknessIdentified },
              },
              update: { count: { increment: 1 }, lastSeen: now },
              create: {
                userId: finalUser.id,
                rule: weaknessIdentified,
                count: 1,
                lastSeen: now,
              },
            }),
          );
          const nodeSlug = mapWeaknessToNodeSlug(weaknessIdentified);
          if (nodeSlug) {
            weaknessPromises.push(
              prisma.userSkillProgress
                .upsert({
                  where: {
                    userId_nodeSlug: { userId: finalUser.id, nodeSlug },
                  },
                  update: { practiced: { increment: 1 } },
                  create: {
                    userId: finalUser.id,
                    nodeSlug,
                    practiced: 1,
                    correct: 0,
                  },
                })
                .catch((err: unknown) => {
                  console.error("skill progress error:", err);
                  return null;
                }),
            );
          }
        }
        if (strengthIdentified) {
          const strengthKey = `strength:${strengthIdentified.toLowerCase().trim()}`;
          weaknessPromises.push(
            prisma.grammarWeakness
              .upsert({
                where: {
                  userId_rule: { userId: finalUser.id, rule: strengthKey },
                },
                update: { count: { increment: 1 }, lastSeen: now },
                create: {
                  userId: finalUser.id,
                  rule: strengthKey,
                  count: 1,
                  lastSeen: now,
                },
              })
              .catch((err: unknown) => {
                console.error("strength upsert error:", err);
                return null;
              }),
          );
        }

        // ── Persist user state ─────────────────────────────────────────────
        await Promise.all([
          prisma.user.update({
            where: { id: finalUser.id },
            data: {
              currentHP: newHP,
              diveDepth: finalDepth,
              maxDiveDepth:
                finalDepth > (finalUser.maxDiveDepth ?? 0)
                  ? finalDepth
                  : undefined,
              streak: currentStreak,
              ...(newLastStreakAt ? { lastStreakAt: newLastStreakAt } : {}),
              lastActiveAt: now,
              ...(vocabScore !== null
                ? {
                    avgVocabulary: Math.round(
                      (finalUser.avgVocabulary ?? 50) * (1 - EMA_ALPHA) +
                        vocabScore * EMA_ALPHA,
                    ),
                  }
                : {}),
              ...(complexityScore !== null
                ? {
                    avgComplexity: Math.round(
                      (finalUser.avgComplexity ?? 50) * (1 - EMA_ALPHA) +
                        complexityScore * EMA_ALPHA,
                    ),
                  }
                : {}),
              ...(fluencyScore !== null
                ? {
                    avgFluency: Math.round(
                      (finalUser.avgFluency ?? 50) * (1 - EMA_ALPHA) +
                        fluencyScore * EMA_ALPHA,
                    ),
                  }
                : {}),
            },
          }),
          ...weaknessPromises,
        ]);

        // ── Quests Evaluation ──
        const activeQuests = await prisma.quest.findMany();
        // Only skip quests completed TODAY — daily quests must reset each day
        const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0));
        const completedUserQuests = await prisma.userQuest.findMany({
          where: { userId: finalUser.id, completed: true, completedAt: { gte: todayStart } },
        });
        const completedQuestIds = new Set(
          completedUserQuests.map((q) => q.questId),
        );

        const newlyCompletedQuests: string[] = [];
        let questXpGain = 0;

        for (const quest of activeQuests) {
          if (completedQuestIds.has(quest.id)) continue;

          let isCompleted = false;
          // Strip 'Daily: ' prefix to reuse existing evaluation logic for quests generated by LLM that borrow similar names
          const title = quest.title.replace(/^Daily:\s*/, "");

          // ── GRAMMAR ──
          if (title === "Flawless 5") {
            const last5 = await prisma.message.findMany({
              where: { chatSessionId: session.id, sender: "AI" },
              orderBy: { createdAt: "desc" },
              take: 5,
            });
            if (last5.length === 5 && last5.every((m: any) => !m.weaknessIdentified))
              isCompleted = true;
          } else if (title === "Article Ace") {
            const last3 = await prisma.message.findMany({
              where: { chatSessionId: session.id, sender: "AI" },
              orderBy: { createdAt: "desc" },
              take: 3,
            });
            if (last3.length === 3 && last3.every((m: any) => !m.weaknessIdentified?.toLowerCase().includes("article")))
              isCompleted = true;
          } else if (title === "Past Perfect Pro") {
            if (strengthIdentified?.toLowerCase().includes("past perfect") ||
              (sanitizedText.match(/(had\s+\w+ed|had\s+been)/i) && !weaknessIdentified?.toLowerCase().includes("past perfect")))
              isCompleted = true;
          } else if (title === "Conditional Master") {
            if (strengthIdentified?.toLowerCase().includes("conditional") ||
              (sanitizedText.match(/\b(if|would)\b/i) && !weaknessIdentified?.toLowerCase().includes("conditional")))
              isCompleted = true;
          } else if (title === "Tense Juggler") {
            // 3+ different tense keywords in one message, no errors
            const tensePatterns = [/\b(am|is|are|do|does)\b/i, /\b(was|were|did)\b/i, /\b(will|shall|going to)\b/i, /\b(have|has)\s+\w+/i];
            const matches = tensePatterns.filter(p => p.test(sanitizedText)).length;
            if (matches >= 3 && !weaknessIdentified) isCompleted = true;

          // ── VOCABULARY ──
          } else if (title === "Vocabulary Flex") {
            if (vocabScore != null && vocabScore >= 70) isCompleted = true;
          } else if (title === "Academic Voice") {
            if (vocabScore != null && vocabScore >= 80) isCompleted = true;
          } else if (title === "Synonym Swap" || title === "Idiom Drop" || title === "Word Explorer") {
            // Triggered if AI detects vocabulary strength
            if (strengthIdentified?.toLowerCase().includes("vocab") || strengthIdentified?.toLowerCase().includes("idiom") || strengthIdentified?.toLowerCase().includes("synonym"))
              isCompleted = true;

          // ── FLUENCY ──
          } else if (title === "Complex Thinker") {
            if (sanitizedText.match(/\b(because|although|since|while|which|who|that)\b/i) &&
              sanitizedText.split(" ").length > 8 && !weaknessIdentified)
              isCompleted = true;
          } else if (title === "Smooth Talker") {
            if (fluencyScore != null && fluencyScore >= 70) isCompleted = true;
          } else if (title === "Long Form") {
            if (sanitizedText.split(" ").length > 20 && !weaknessIdentified) isCompleted = true;
          } else if (title === "Eloquence") {
            if (fluencyScore != null && fluencyScore >= 80 && complexityScore != null && complexityScore >= 80) isCompleted = true;
          } else if (title === "Natural Flow") {
            const last3AI = await prisma.message.findMany({
              where: { chatSessionId: session.id, sender: "AI" },
              orderBy: { createdAt: "desc" },
              take: 3,
            });
            if (last3AI.length === 3 && last3AI.every((m: any) => !m.weaknessIdentified))
              isCompleted = true;

          // ── CONSISTENCY ──
          } else if (title === "Depth Diver" || title === "Marathon" || title === "Warm Up") {
            // Count across ALL sessions today (not just the current chat)
            const userSessionIds = (await prisma.sessionParticipant.findMany({
              where: { userId: finalUser.id },
              select: { chatSessionId: true },
            })).map((s: any) => s.chatSessionId);
            const count = await prisma.message.count({
              where: { chatSessionId: { in: userSessionIds }, sender: "USER", createdAt: { gte: todayStart } },
            });
            const target = title === "Marathon" ? 15 : title === "Depth Diver" ? 10 : 3;
            if (count >= target) isCompleted = true;
          } else if (title === "Streak Builder") {
            if (currentStreak >= 2) isCompleted = true;
          } else if (title === "Error Crusher") {
            // Check if user fixed a previously identified error
            if (recentWeaknesses.length > 0 && !weaknessIdentified) {
              const lastWeakness = recentWeaknesses[0]?.rule?.toLowerCase();
              if (lastWeakness && strengthIdentified?.toLowerCase().includes(lastWeakness))
                isCompleted = true;
            }

          // ── ENGAGEMENT ──
          } else if (title === "Question Time") {
            if (sanitizedText.match(/\?/) && sanitizedText.match(/\b(what|where|when|why|how|who|which|do|does|did|is|are|can|could|would|will)\b/i) && !weaknessIdentified)
              isCompleted = true;
          } else if (title === "Opinion Piece") {
            if (sanitizedText.match(/\b(because|since|as|i think|i believe|in my opinion)\b/i) && !weaknessIdentified)
              isCompleted = true;
          } else if (title === "Story Starter") {
            const sentences = sanitizedText.split(/[.!?]+/).filter(s => s.trim().length > 5);
            if (sentences.length >= 3 && !weaknessIdentified) isCompleted = true;
          } else if (title === "Debate Club") {
            if (sanitizedText.match(/\b(disagree|but i think|however|actually|on the contrary)\b/i))
              isCompleted = true;
          } else if (title === "Deep Dive") {
            const userSessionIds2 = (await prisma.sessionParticipant.findMany({
              where: { userId: finalUser.id },
              select: { chatSessionId: true },
            })).map((s: any) => s.chatSessionId);
            const userMsgCount = await prisma.message.count({
              where: { chatSessionId: { in: userSessionIds2 }, sender: "USER", createdAt: { gte: todayStart } },
            });
            if (userMsgCount >= 8) isCompleted = true;
          }

          if (isCompleted) {
            newlyCompletedQuests.push(quest.id);
            questXpGain += quest.xp;
          }
        }

        if (newlyCompletedQuests.length > 0) {
          for (const qid of newlyCompletedQuests) {
            const existingUQ = await prisma.userQuest.findFirst({ where: { userId: finalUser.id, questId: qid } });
            if (existingUQ) {
              await prisma.userQuest.update({ where: { id: existingUQ.id }, data: { completed: true, completedAt: now } });
            } else {
              await prisma.userQuest.create({ data: { userId: finalUser.id, questId: qid, completed: true, completedAt: now } });
            }
          }
        }

        // XP awards — base 1 per message, +2 bonus for clean message, +50 for streak milestone.
        const xpGain = 1 + (weaknessIdentified ? 0 : 2);
        const isStreakMilestone =
          [3, 7, 14, 30, 60, 100].includes(currentStreak) && newLastStreakAt;
        const xpToAdd = isStreakMilestone ? xpGain + 50 : xpGain;
        // Quest completion reward: give depth meters instead of XP
        const questDepthBonus = questXpGain; // quest.xp values are used as depth meters
        prisma.user
          .update({
            where: { id: finalUser.id },
            data: {
              xp: { increment: xpToAdd },
              ...(questDepthBonus > 0 ? {
                diveDepth: { increment: questDepthBonus },
                maxDiveDepth: finalDepth + questDepthBonus > (finalUser.maxDiveDepth ?? 0)
                  ? { set: finalDepth + questDepthBonus }
                  : undefined,
              } : {}),
            },
          })
          .catch((err: unknown) =>
            console.error("[stream] XP/depth update failed:", err),
          );

        send({
          type: "done",
          sessionId: session.id,
          aiMessage: { ...aiMessage, suggestion },
          depthDelta,
          currentDepth: finalDepth,
          errorSpan: validErrorSpan,
          hpDelta,
          currentHP: newHP,
          strengthIdentified: strengthIdentified ?? null,
          userLevel,
          currentStreak,
        });

        // Trigger asynchronous Memory Extraction securely after the response is sent
        after(async () => {
          try {
            const { backgroundMemoryExtraction } =
              await import("@/lib/ai/memory-extractor");
            await backgroundMemoryExtraction({
              text: safeUserText,
              userId: finalUser.id,
              personaId: persona!.id,
            });
          } catch (err) {
            console.error("[Memory Extractor] Background error:", err);
          }
        });
      } catch (err) {
        console.error("stream chat error:", err);
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
