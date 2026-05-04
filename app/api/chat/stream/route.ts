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
import { mapWeaknessToNodeSlug, GRAMMAR_NODES } from "@/lib/game/grammar-nodes";

const VALID_TOPICS_LIST = GRAMMAR_NODES.map(n => n.title).join(", ");
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

NEVER say you're teaching. NEVER say "great job". NEVER break character in the "reply" field.
Your secret job: help them improve English through immersive conversation. Correct errors so smoothly they feel like your natural speech.

REPLY RULES:
- "reply": string. Your message. Follow natural texting patterns.
  - To send 2 separate messages (bubbles), separate them with EXACTLY two newlines (\n\n).
- "replyToUserMsg": boolean. Randomly set this to true ~20% of the time.

EDUCATIONAL ANALYSIS (STRICTLY OBJECTIVE JSON):
These fields are for the user's learning system. They MUST be objective, neutral, and educational. They are NOT spoken by your persona. Do NOT use persona-driven judgments here.
- internalGrammarCheck: A short step-by-step thought process.
- grammarCorrection: A SHORT grammar RULE explaining WHY the user's sentence is wrong, written in [EXPLANATION_LANGUAGE]. 
  FORMAT: "❌ [wrong] → ✅ [correct] — [Rule: name. Objective explanation]."
  STRICTLY null if no error. MUST BE A STRING, NOT AN OBJECT.
- weaknessIdentified: Choose EXACTLY ONE topic from the [VALID_TOPICS] list.
- errorSpan: {"original": "<exact wrong phrase>", "corrected": "<how it should be>"}.
- vocabularyNote: Objective explanation of a poor word choice. null if not triggered.
- vibeNote: Objective explanation of tone issues (archaic, formal, aggressive). null if not triggered.

QUESTS:
- completedQuestIds: array of UUIDs for any quests from the [ACTIVE_QUESTS] list that the user successfully completed in their latest message.
- questUpdates: { "uuid": number } - If a quest requires multiple steps (e.g. "Use 3 idioms"), return the count of new steps completed (e.g. 1). ONLY for quests from [ACTIVE_QUESTS].

LANGUAGE SCORING (0-100 integers):
- vocabScore, complexityScore, fluencyScore, grammarScore, accuracyScore
- levelAdjustment: -2 to +2
- userLevel: "A1"/"A2"/"B1"/"B2"/"C1"

ALWAYS respond with ONLY valid JSON.
{
  "internalGrammarCheck": "...",
  "reply": "...",
  "replyToUserMsg": false,
  "grammarCorrection": "..." | null,
  "weaknessIdentified": "..." | null,
  "strengthIdentified": "..." | null,
  "errorSpan": { "original": "...", "corrected": "..." } | null,
  "vocabularyNote": "..." | null,
  "vibeNote": "..." | null,
  "completedQuestIds": [],
  "questUpdates": {},
  "levelAdjustment": 0,
  "userLevel": "B1",
  "vocabScore": 50,
  "complexityScore": 50,
  "fluencyScore": 50,
  "grammarScore": 50,
  "accuracyScore": 50,
  "skillUpdates": [{"slug": "...", "progress": 10}] | null
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
        const [userRecord, recentWeaknesses, activeQuests] = await Promise.all([
          prisma.user.findUnique({ where: { id: user.id } }),
          prisma.grammarWeakness.findMany({
            where: { userId: user.id },
            orderBy: { lastSeen: "desc" },
            take: 5,
          }),
          prisma.userQuest.findMany({
            where: { userId: user.id, completed: false },
            include: { quest: true },
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
        const { allowed: msgAllowed, resetAt } = await checkMessageLimit(finalUser.id);
        if (!msgAllowed) {
          send({
            type: "error",
            error: "DAILY_LIMIT_REACHED",
            limitReached: true,
            remaining: 0,
            isPro: false,
            resetAt,
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
        
        const totalUserMessages = await prisma.message.count({
          where: { chatSessionId: session.id, sender: "USER" },
        });

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
          
        const isAuditTrigger = totalUserMessages > 0 && totalUserMessages % 10 === 0;
        const auditLine = isAuditTrigger
          ? "SYSTEM DIRECTIVE: This is a 10-message audit. You MUST analyze the user's overall grammar and vocabulary. If you detect a recurring grammar or vocab topic that they need to practice (especially a NEW one not in [VALID_TOPICS]), include it in `skillUpdates: [{\"slug\": \"topic-name\", \"progress\": <0-100>}]`. Keep `slug` lowercase with hyphens."
          : "";

        const questsStr = activeQuests.length > 0
          ? `[ACTIVE_QUESTS]:\n${activeQuests.map(uq => `- UUID: ${uq.quest.id} | Title: "${uq.quest.title}" | Goal: ${uq.quest.description} | Current Progress: ${uq.progress || 0}`).join("\n")}\nCRITICAL: Track quest progress on EVERY message.\n- If the user's message contributes to a quest goal (e.g., sends a message, uses a word, writes a sentence), increment the progress in 'questUpdates': { "UUID": 1 }.\n- If the goal is FULLY completed (current progress + 1 >= target), ALSO add the UUID to 'completedQuestIds'.\n- For message-count quests: Each message sent = +1 progress.\n- For vocabulary/grammar quests: If they use the required structure correctly = +1 progress.\n- ALWAYS return questUpdates for any progress made, not just completions.`
          : "";

        const systemPrompt = [
          INJECTION_GUARD,
          "",
          persona.systemPrompt
            ? `PERSONA: ${persona.systemPrompt}`
            : `PERSONA: You are ${persona.name}, a confident, witty person with strong opinions.`,
          `Native language of user: ${finalUser.nativeLanguage || "English"}`,
          `[EXPLANATION_LANGUAGE] = ${explanationLang}`,
          `[VALID_TOPICS] = ${VALID_TOPICS_LIST}`,
          questsStr,
          `User depth level: ${finalUser.diveDepth ?? 0}/200`,
          weaknessLine,
          analysisLine,
          auditLine,
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
          weaknessIdentified: rawWeakness,
          strengthIdentified,
          vocabularyNote,
          vibeNote,
          suggestion,
          completedQuestIds,
          questUpdates,
          grammarScore,
          accuracyScore,
          errorSpan,
        } = parsedReply;

        // Guard: LLMs sometimes return the string "None" instead of JSON null
        const weaknessIdentified =
          rawWeakness && String(rawWeakness).trim().toLowerCase() !== 'none'
            ? rawWeakness
            : null;

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


        const aiMessage = await prisma.message.create({
          data: {
            text: aiText,
            sender: "AI",
            chatSessionId: session.id,
            grammarCorrection: grammarCorrection
              ? String(grammarCorrection)
              : null,
            vocabularyNote: vocabularyNote ? String(vocabularyNote) : null,
            vibeNote: vibeNote ? String(vibeNote) : null,
            weaknessIdentified: weaknessIdentified
              ? String(weaknessIdentified)
              : null,
            xpReward: weaknessIdentified ? 0 : (
              strengthIdentified ? 2 : 1
            ),
            replyToId: parsedReply.replyToUserMsg ? userMsg.id : undefined,
            metrics: {
              vocabScore: parsedReply.vocabScore,
              complexityScore: parsedReply.complexityScore,
              fluencyScore: parsedReply.fluencyScore,
              grammarScore: parsedReply.grammarScore,
              accuracyScore: parsedReply.accuracyScore,
            },
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
          sanitizedText.toLowerCase().includes(rawErrorSpan.original.toLowerCase())
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
        const questPromise = import("@/lib/game/quests").then((m) =>
          m.checkQuestCompletion(finalUser.id, session.id, {
            consecutiveClean: currentStreak,
            sessionMsgCount: totalUserMessages + 1,
            vocabScore: vocabScore,
            complexityScore: complexityScore,
          })
        );
        
        questPromise.then(async completedQuest => {
          if (completedQuest) {
            send({ type: "stats", questCompleted: completedQuest });
            await prisma.user.update({
              where: { id: finalUser.id },
              data: {
                diveDepth: { increment: completedQuest.depthReward },
                maxDiveDepth: finalDepth + completedQuest.depthReward > (finalUser.maxDiveDepth ?? 0)
                  ? { set: finalDepth + completedQuest.depthReward }
                  : undefined,
              }
            });
          }
        }).catch(err => console.error("Quest eval error:", err));

        // Process LLM-driven quest updates and completions
        let questCompletions: Array<{ title: string; depthReward: number }> = [];
        if ((completedQuestIds && Array.isArray(completedQuestIds) && completedQuestIds.length > 0) || (questUpdates && typeof questUpdates === 'object')) {
          const idsToProcess = new Set<string>(completedQuestIds || []);
          const increments = (questUpdates as Record<string, number>) || {};

          for (const questId of new Set([...idsToProcess, ...Object.keys(increments)])) {
            const activeUq = activeQuests.find(uq => uq.quest.id === questId);
            if (activeUq) {
              const increment = increments[questId] || 0;
              const newProgress = (activeUq.progress || 0) + increment;

              // Extract target from description (e.g. "Use 3 words" -> target=3)
              let target = 1;
              const numMatch = activeUq.quest.description.match(/\b(\d+)\b/);
              if (numMatch) target = parseInt(numMatch[1], 10);

              const isNewlyCompleted = idsToProcess.has(questId) || newProgress >= target;

              if (isNewlyCompleted && !activeUq.completed) {
                const depthReward = Math.max(1, Math.ceil(activeUq.quest.xp / 10));
                await prisma.userQuest.update({
                  where: { id: activeUq.id },
                  data: { completed: true, completedAt: new Date(), progress: target },
                });
                questCompletions.push({ title: activeUq.quest.title, depthReward });
                await prisma.user.update({
                  where: { id: finalUser.id },
                  data: {
                    diveDepth: { increment: depthReward }
                  }
                });
              } else if (increment > 0 && !activeUq.completed) {
                await prisma.userQuest.update({
                  where: { id: activeUq.id },
                  data: { progress: Math.min(target, newProgress) },
                });
              }
            }
          }
        }

        // Server-side: Auto-increment progress for message-count quests
        for (const uq of activeQuests) {
          if (uq.completed) continue;
          const desc = uq.quest.description.toLowerCase();
          // Check if this is a message-count quest
          if (desc.includes('send') && (desc.includes('message') || desc.includes('messages'))) {
            const numMatch = uq.quest.description.match(/\b(\d+)\b/);
            if (numMatch) {
              const target = parseInt(numMatch[1], 10);
              const newProgress = (uq.progress || 0) + 1;
              if (newProgress >= target) {
                const depthReward = Math.max(1, Math.ceil(uq.quest.xp / 10));
                await prisma.userQuest.update({
                  where: { id: uq.id },
                  data: { completed: true, completedAt: new Date(), progress: target },
                });
                questCompletions.push({ title: uq.quest.title, depthReward });
                await prisma.user.update({
                  where: { id: finalUser.id },
                  data: {
                    diveDepth: { increment: depthReward }
                  }
                });
              } else {
                await prisma.userQuest.update({
                  where: { id: uq.id },
                  data: { progress: newProgress },
                });
              }
            }
          }
        }

        // Depth awards — base 1 per message, +2 bonus for clean message, +50 for streak milestone.
        const depthGain = 1 + (weaknessIdentified ? 0 : 2);
        const isStreakMilestone =
          [3, 7, 14, 30, 60, 100].includes(currentStreak) && newLastStreakAt;
        const depthToAdd = isStreakMilestone ? depthGain + 50 : depthGain;
        // Depth reward for messages
        prisma.user
          .update({
            where: { id: finalUser.id },
            data: {
              diveDepth: { increment: depthToAdd },
              maxDiveDepth: finalDepth + depthToAdd > (finalUser.maxDiveDepth ?? 0)
                ? { set: finalDepth + depthToAdd }
                : undefined,
            }
          })
          .catch((err: unknown) =>
            console.error("Depth update error:", err),
          );

        send({
          type: "done",
          sessionId: session.id,
          aiMessage: { ...aiMessage, suggestion },
          depthDelta,
          currentDepth: finalDepth,
          errorSpan: validErrorSpan,
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
            
            // Skill updates asynchronously
            const skillUpdates = parsedReply.skillUpdates;
            if (skillUpdates && Array.isArray(skillUpdates)) {
              for (const update of skillUpdates) {
                if (update.slug && typeof update.progress === 'number') {
                  const slug = String(update.slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
                  let node = await prisma.skillNode.findUnique({ where: { slug } });
                  if (!node) {
                    node = await prisma.skillNode.create({
                      data: {
                        slug,
                        title: slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                        description: `Custom dynamically generated node for ${slug}`,
                        category: 'Grammar',
                        isCustom: true
                      }
                    });
                  }
                  await prisma.userSkillProgress.upsert({
                    where: { userId_nodeSlug: { userId: finalUser.id, nodeSlug: slug } },
                    update: {
                      practiced: { increment: 1 },
                      correct: { increment: update.progress > 50 ? 1 : 0 }
                    },
                    create: {
                      userId: finalUser.id,
                      nodeSlug: slug,
                      practiced: 1,
                      correct: update.progress > 50 ? 1 : 0
                    }
                  });
                }
              }
            }
          } catch (err) {
            console.error("[Background Error]:", err);
          }
        });
      } catch (err) {
        console.error("stream chat error:", err);
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Stream failed",
        });
      } finally {
        await new Promise(r => setTimeout(r, 100)); // allow async send events to flush before closing stream
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
