"use server";

import prisma from '@/lib/db/prisma';
import { mapWeaknessToNodeSlug } from '@/lib/game/grammar-nodes';
import { checkMessageLimit, incrementMessageCount } from '@/lib/auth/subscription';

// Sliding window: last N messages (includes hidden call transcripts for context)
import { CHAT_MAX_CONTEXT_MESSAGES as MAX_CONTEXT_MESSAGES, CHAT_MAX_COMPLETION_TOKENS as MAX_COMPLETION_TOKENS } from '@/src/config/gameplayConfig';

import { resolveHP } from '@/lib/game/hp-engine';
import { calculateDepth, calculateStreak } from '@/lib/game/mechanics';
import { checkQuestCompletion, QuestCheckParams, generateBonusQuest } from '@/lib/game/quests';
import { calculateCEFRLevel, calculateRollingAverage, clampScore } from '@/lib/services/user-stats';
import { generateChatResponse } from '@/lib/ai/groq-chat';
import { processTikTokMultimodal, FullTikTokContext } from '@/lib/ai/tiktok-processor';


function sseEvent(event: string, data: object | string): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

export async function sendMessageStream(
  chatSessionId: string | null,
  userId: string | null | undefined,
  text: string,
  personaId?: string | null,
  lastReaction?: string | null,
  isTikTok?: boolean,
): Promise<ReadableStream<Uint8Array>> {
  if (!text?.trim()) throw new Error('Missing text');
  if (!userId) throw new Error('ANONYMOUS_ID_MISSING');

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (data: string) => {
        try { controller.enqueue(encoder.encode(data)); } catch { /* closed */ }
      };

      try {

        const [userRecord, recentWeaknesses] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId! } })
            .then(u => u ?? prisma.user.create({
              data: { id: userId!, email: `anon_${userId}@aura.local`, name: 'Anonymous' },
            })),
          prisma.grammarWeakness.findMany({
            where: { userId: userId! },
            orderBy: { lastSeen: 'desc' },
            take: 10,
          }),
        ]);

        // ── Daily message limit (free tier gate) ───────────────────────────
        const { allowed, remaining, isPro } = await checkMessageLimit(userRecord.id);
        if (!allowed) {
          enqueue(sseEvent('error', {
            error: 'DAILY_LIMIT_REACHED',
            remaining: 0,
            isPro: false,
            message: 'You\'ve reached your 20 messages for today. Upgrade to Aura Pro for unlimited chats.',
          }));
          controller.close();
          return;
        }

        // Find or create persona
        // SAFETY: Never use findFirst() — it may return another user's private persona.
        let persona = personaId
          ? await prisma.persona.findUnique({ where: { id: personaId } })
          : await prisma.persona.findFirst({ where: { creatorId: userRecord.id }, orderBy: { name: 'asc' } });
        if (!persona) {
          persona = await prisma.persona.create({
            data: { name: 'Alex', description: 'Curious, opinionated friend', systemPrompt: null, isPublic: false },
          });
        }

        // Find or create 1:1 session (enforced by @@unique([userId, personaId]))
        let session: { id: string } | null = chatSessionId
          ? await prisma.chatSession.findUnique({ where: { id: chatSessionId } })
          : null;

        if (!session) {
          // Try to find by unique 1:1 constraint
          const existingByUnique = await prisma.chatSession.findUnique({
            where: { userId_personaId: { userId: userRecord.id, personaId: persona.id } },
          });

          if (existingByUnique) {
            session = existingByUnique;
          } else {
            session = await prisma.chatSession.create({
              data: {
                userId: userRecord.id,
                personaId: persona.id,
                participants: { create: { userId: userRecord.id } },
                personas: { create: { personaId: persona.id } },
              },
            });
          }
        }

        // Save user message
        const userMsg = await prisma.message.create({
          data: {
            text: text.trim(),
            sender: 'USER',
            chatSessionId: session.id,
            senderUserId: userRecord.id,
          },
        });

        // Increment daily counter now that message is committed to DB.
        // Fire-and-forget — a failure here should never block the response.
        incrementMessageCount(userRecord.id).catch(err =>
          console.error('[chat] Failed to increment message count:', err)
        );

        // Emit session ID first so client can correlate
        enqueue(sseEvent('session', { sessionId: session.id, userMsgId: userMsg.id }));

        // Fetch last AI message for DB-side reaction injection + conversation history
        const [historyRaw, lastAIWithReaction] = await Promise.all([
          prisma.message.findMany({
            where: { chatSessionId: session.id },
            orderBy: { createdAt: 'desc' },
            take: MAX_CONTEXT_MESSAGES,
            select: { text: true, sender: true, isHiddenFromChat: true },
          }),
          prisma.message.findFirst({
            where: {
              chatSessionId: session.id,
              sender: 'AI',
              reaction: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, reaction: true },
          }),
        ]);

        const history = historyRaw.reverse();

        // Reaction injection — fetch from DB, clear immediately after reading (fire-once)
        let reactionInject = '';
        if (lastAIWithReaction?.reaction) {
          reactionInject = `[System info: The user reacted with ${lastAIWithReaction.reaction} to your previous message. Let this subtly inform your tone in the next reply — do not announce the reaction, just reflect it naturally.]\n`;
          // Clear immediately so it never re-injects on refresh
          await prisma.message.update({
            where: { id: lastAIWithReaction.id },
            data: { reaction: null },
          });
        }

        // Grammar weakness summary for system prompt — include error counts for context
        const weaknessSummary = recentWeaknesses
          .filter(w => !w.rule.startsWith('strength:'))
          .length > 0
          ? `User's recurring grammar weaknesses: ${recentWeaknesses
            .filter(w => !w.rule.startsWith('strength:'))
            .slice(0, 5)
            .map(w => `${w.rule} (×${w.count})`)
            .join(', ')}.`
          : '';

        // -- Stealth Practice Injection --
        let stealthDirective = '';
        let stealthGrammarTargetSlug: string | null = null;

        if ((userRecord as any).stealthInjectVocab || (userRecord as any).stealthInjectGrammar) {
          const directives: string[] = [];
          if ((userRecord as any).stealthInjectVocab) {
            const flashcard = await prisma.flashcard.findFirst({
              where: { userId: userRecord.id },
              orderBy: { nextReview: 'asc' }, // Get one that is due or active
            });
            if (flashcard) {
              directives.push(`Use the word '${flashcard.front}' (or its native translation: '${flashcard.back}') naturally.`);
            }
          }
          if ((userRecord as any).stealthInjectGrammar) {
            // Find an active node (practiced > 0) to challenge them on
            const activeProgresses = await prisma.userSkillProgress.findMany({
              where: { userId: userRecord.id, practiced: { gt: 0 } },
              orderBy: { updatedAt: 'desc' },
              take: 10
            });
            // Filter for mastery < 15
            const activeSlot = activeProgresses.find(p => p.correct < 15);
            if (activeSlot) {
              stealthGrammarTargetSlug = activeSlot.nodeSlug;
              directives.push(`Subtly challenge the user to respond using the grammar concept related to '${activeSlot.nodeSlug}'.`);
            }
          }
          if (directives.length > 0) {
            stealthDirective = `\n[PEDAGOGICAL DIRECTIVE - STRICT HIDDEN INSTRUCTION]\n${directives.join(' ')}\nDo NOT announce this. Weave it into your text seamlessly so it sounds like casual conversation.`;
          }
        }

        // Find last AI stealth target for Synergy
        const lastAIAttempt = await prisma.message.findFirst({
          where: { chatSessionId: session.id, sender: 'AI', stealthTarget: { not: null } },
          orderBy: { createdAt: 'desc' }
        });
        const prevStealthTarget = lastAIAttempt?.stealthTarget;

        // ── TikTok 2.0: Multimodal Context Fetching (Whisper + Vision) ───────────
        // This allows the persona to react to the exact AUDIO or VISION content.
        let tiktokContext: FullTikTokContext | null = null;
        if (isTikTok) {
          // Extract just the TikTok URL from the message text (user may have written text around it)
          const urlMatch = text.match(/https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/\S+/i);
          const cleanUrl = urlMatch ? urlMatch[0].split('?')[0] : text.trim().split('?')[0];
          tiktokContext = await processTikTokMultimodal(cleanUrl, null);
        }

        const { bubbles, parsedMeta } = await generateChatResponse({
          text,
          history,
          persona,
          userRecord: {
            nativeLanguage: userRecord.nativeLanguage,
            explanationLanguage: userRecord.explanationLanguage,
            diveDepth: userRecord.diveDepth
          },
          reactionInject,
          weaknessSummary,
          memoryContext: stealthDirective,
          isTikTok: !!isTikTok,
          tiktokContext, // Passes the full multimodal object
          stealthTargets: { prevStealthTarget }
        });

        // Extract metadata from last bubble parse
        const {
          grammarCorrection = null,
          weaknessIdentified = null,
          strengthIdentified = null,
          suggestion = null,
          errorSpan = null,
          levelAdjustment: rawAdj = 0,
          vocabScore: rawVocab,
          complexityScore: rawComplex,
          fluencyScore: rawFluency,
          grammarScore: rawGrammar,
          accuracyScore: rawAccuracy,
        } = parsedMeta;

        const levelAdjustment = Math.max(-2, Math.min(2, Math.round(Number(rawAdj) || 0)));

        const vocabScore = clampScore(rawVocab);
        const complexityScore = clampScore(rawComplex);
        const fluencyScore = clampScore(rawFluency);
        const grammarScore = clampScore(rawGrammar);
        const accuracyScore = clampScore(rawAccuracy);

        // HP calculation — unified through hp-engine.ts
        const currentHP = userRecord.currentHP ?? 100;
        const currentDiveDepth = userRecord.diveDepth ?? 0;
        const hpEvent = weaknessIdentified ? 'chat_major_error' : 'chat_clean';
        const { newHP, delta: hpDelta } = resolveHP(hpEvent, currentHP, currentDiveDepth);

        // Depth calculation
        const now = new Date();
        const withoutEmoji = text.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, '').trim();
        const realWords = withoutEmoji.split(/\s+/).filter(w => /[a-zA-Z\u0400-\u04FF]/.test(w));
        const isMeaningful = realWords.length >= 2;
        // Skip grammar for TikTok URLs or emoji-only messages
        const skipGrammar = realWords.length === 0 || !!isTikTok;

        const { finalDepth, depthDelta } = calculateDepth(
          currentDiveDepth,
          userRecord.lastActiveAt ? new Date(userRecord.lastActiveAt) : null,
          now,
          isMeaningful,
          levelAdjustment
        );

        // Honest CEFR
        const updatedVocab = calculateRollingAverage(userRecord.avgVocabulary, vocabScore);
        const updatedComplexity = calculateRollingAverage(userRecord.avgComplexity, complexityScore);
        const updatedFluency = calculateRollingAverage(userRecord.avgFluency, fluencyScore);
        const updatedGrammar = calculateRollingAverage(userRecord.avgGrammar, grammarScore);
        const updatedAccuracy = calculateRollingAverage(userRecord.avgAccuracy, accuracyScore);

        const totalMsgs = await prisma.message.count({ where: { chatSessionId: session.id, sender: 'AI' } });
        const totalErrors = await prisma.message.count({ where: { chatSessionId: session.id, sender: 'AI', weaknessIdentified: { not: null } } });
        const errorRate = totalMsgs > 0 ? totalErrors / totalMsgs : 0;

        let userLevel: string | null = null;
        if (updatedVocab !== null && updatedComplexity !== null && updatedFluency !== null) {
          userLevel = calculateCEFRLevel(finalDepth, errorRate, updatedVocab, updatedComplexity, updatedFluency);
        }

        // Streak calculation
        const { newStreak: currentStreak, newLastStreakAt } = calculateStreak(
          userRecord.streak ?? 0,
          userRecord.lastStreakAt ? new Date(userRecord.lastStreakAt) : null,
          now
        );

        // personalBestDepth update
        const newPersonalBestDepth = finalDepth > (userRecord.personalBestDepth ?? 0)
          ? finalDepth
          : (userRecord.personalBestDepth ?? 0);

        // Validate errorSpan
        const rawErrorSpan = errorSpan && typeof errorSpan === 'object'
          && typeof (errorSpan as any).original === 'string'
          && typeof (errorSpan as any).corrected === 'string'
          && (errorSpan as any).original.trim().length > 0
          ? { original: (errorSpan as any).original.trim(), corrected: (errorSpan as any).corrected.trim() }
          : null;

        const validErrorSpan = rawErrorSpan && !skipGrammar && text.includes(rawErrorSpan.original)
          ? rawErrorSpan
          : null;

        // Update user message with errorSpan
        if (validErrorSpan) {
          await prisma.message.update({
            where: { id: userMsg.id },
            data: { errorSpan: validErrorSpan },
          });
        }

        // Emit errorSpan update for user message
        enqueue(sseEvent('user_update', { userMsgId: userMsg.id, errorSpan: validErrorSpan }));

        // Save each bubble as a separate Message, emit with stagger
        const savedBubbles: Array<{ id: string; text: string }> = [];

        for (let i = 0; i < bubbles.length; i++) {
          const bubbleText = bubbles[i];
          const isLastBubble = i === bubbles.length - 1;

          // Typing indicator before each bubble
          enqueue(sseEvent('typing_indicator', { bubbleIndex: i }));

          // Dynamic delay: simulate typing speed (approx 18ms per char + 400ms base thinking/transition)
          // For the first bubble it's usually faster as AI "already thought", for second it feels like double-texting.
          const typingDelay = Math.min(3000, Math.max(1200, bubbleText.length * 15));
          await new Promise(r => setTimeout(r, typingDelay));

          // Randomly make the first bubble a "reply" to the user's message (visual quote)
          const shouldReply = i === 0 && Math.random() < 0.22;

          // Grammar metadata only on the last bubble
          const aiMsg = await prisma.message.create({
            data: {
              text: bubbleText,
              sender: 'AI',
              chatSessionId: session.id,
              senderPersonaId: persona.id,
              replyToId: shouldReply ? userMsg.id : null,
              grammarCorrection: isLastBubble && !skipGrammar && grammarCorrection ? String(grammarCorrection) : null,
              weaknessIdentified: isLastBubble && !skipGrammar && weaknessIdentified ? String(weaknessIdentified) : null,
              bonusXP: isLastBubble ? !weaknessIdentified : false,
              stealthTarget: isLastBubble && stealthGrammarTargetSlug ? stealthGrammarTargetSlug : null,
            },
          });

          savedBubbles.push({ id: aiMsg.id, text: bubbleText });

          // Emit the bubble
          enqueue(sseEvent('message', {
            id: aiMsg.id,
            text: bubbleText,
            sender: 'AI',
            senderPersonaId: persona.id,
            senderName: persona.name,
            senderAvatar: persona.avatarUrl,
            grammarCorrection: isLastBubble && !skipGrammar ? (grammarCorrection ?? null) : null,
            weaknessIdentified: isLastBubble && !skipGrammar ? (weaknessIdentified ?? null) : null,
            bonusXP: isLastBubble ? !weaknessIdentified : false,
            suggestion: isLastBubble ? (suggestion ?? null) : null,
            errorSpan: isLastBubble ? validErrorSpan : null,
            replyTo: shouldReply ? { id: userMsg.id, text: userMsg.text, sender: 'USER' } : null,
            bubbleIndex: i,
            isLastBubble,
            createdAt: aiMsg.createdAt,
          }));
        }

        // DB updates (async, don't block stream)
        const updatePromises: Promise<unknown>[] = [
          prisma.user.update({
            where: { id: userRecord.id },
            data: {
              currentHP: newHP,
              diveDepth: finalDepth,
              maxDiveDepth: finalDepth > (userRecord.maxDiveDepth ?? 0) ? finalDepth : undefined,
              personalBestDepth: newPersonalBestDepth,
              streak: currentStreak,
              ...(newLastStreakAt ? { lastStreakAt: newLastStreakAt } : {}),
              lastActiveAt: now,
              ...(vocabScore !== null ? { avgVocabulary: Math.round((userRecord.avgVocabulary ?? 50) * 0.9 + vocabScore * 0.1) } : {}),
              ...(complexityScore !== null ? { avgComplexity: Math.round((userRecord.avgComplexity ?? 50) * 0.9 + complexityScore * 0.1) } : {}),
              ...(fluencyScore !== null ? { avgFluency: Math.round((userRecord.avgFluency ?? 50) * 0.9 + fluencyScore * 0.1) } : {}),
              ...(grammarScore !== null ? { avgGrammar: Math.round((userRecord.avgGrammar ?? 50) * 0.9 + grammarScore * 0.1) } : {}),
              ...(accuracyScore !== null ? { avgAccuracy: Math.round((userRecord.avgAccuracy ?? 50) * 0.9 + accuracyScore * 0.1) } : {}),
            },
          }),
          prisma.message.update({
            where: { id: userMsg.id },
            data: { metrics: { vocabScore, complexityScore, fluencyScore, grammarScore, accuracyScore } }
          })
        ];

        if (!skipGrammar && weaknessIdentified) {
          updatePromises.push(
            prisma.grammarWeakness.upsert({
              where: { userId_rule: { userId: userRecord.id, rule: String(weaknessIdentified) } },
              update: { count: { increment: 1 }, lastSeen: now },
              create: { userId: userRecord.id, rule: String(weaknessIdentified), count: 1, lastSeen: now },
            })
          );

          const nodeSlug = mapWeaknessToNodeSlug(String(weaknessIdentified));
          if (nodeSlug) {
            updatePromises.push(
              prisma.userSkillProgress.upsert({
                where: { userId_nodeSlug: { userId: userRecord.id, nodeSlug } },
                update: { practiced: { increment: 1 } },
                create: { userId: userRecord.id, nodeSlug, practiced: 1, correct: 0 },
              }).catch(err => { console.error('Failed to upsert skill progress:', err); return null; })
            );
          }
        } else if (!skipGrammar && !weaknessIdentified) {
          // -- Synergy Bonus or Organic Chat Progression --
          if (prevStealthTarget) {
            // User successfully avoided errors after a stealth grammar injection!
            updatePromises.push(
              prisma.userSkillProgress.upsert({
                where: { userId_nodeSlug: { userId: userRecord.id, nodeSlug: prevStealthTarget } },
                update: { practiced: { increment: 1 }, correct: { increment: 3 } }, // Huge +3 boost
                create: { userId: userRecord.id, nodeSlug: prevStealthTarget, practiced: 1, correct: 3 },
              }).catch(err => console.error('Failed to upsert synergy bonus:', err))
            );
          } else {
            // Organic Progression: give +1 to a random active skill
            const activeNodes = await prisma.userSkillProgress.findMany({
              where: { userId: userRecord.id, practiced: { gt: 0 } },
              take: 50,
            });
            const unmastered = activeNodes.filter(p => p.correct < 15);
            if (unmastered.length > 0) {
              const targetNode = unmastered[Math.floor(Math.random() * unmastered.length)];
              updatePromises.push(
                prisma.userSkillProgress.update({
                  where: { userId_nodeSlug: { userId: userRecord.id, nodeSlug: targetNode.nodeSlug } },
                  data: { correct: { increment: 1 } }, // Passive +1 correct
                }).catch(err => console.error('Failed organic progression:', err))
              );
            }
          }
        }

        if (!skipGrammar && strengthIdentified) {
          const strengthKey = `strength:${String(strengthIdentified).toLowerCase().trim()}`;
          updatePromises.push(
            prisma.grammarWeakness.upsert({
              where: { userId_rule: { userId: userRecord.id, rule: strengthKey } },
              update: { count: { increment: 1 }, lastSeen: now },
              create: { userId: userRecord.id, rule: strengthKey, count: 1, lastSeen: now },
            }).catch(err => { console.error('Failed to upsert strength entry:', err); return null; })
          );
        }

        await Promise.all(updatePromises);

        // Async: Generate a "Bonus Bounty" quest if a weakness was identified
        if (!skipGrammar && weaknessIdentified) {
          generateBonusQuest(userRecord.id, String(weaknessIdentified)).catch(err =>
            console.error('[chat] Background quest generation failed:', err)
          );
        }

        // XP awards — base 1 per message, +2 bonus for clean, +50 for streak milestone.
        // Fire-and-forget so XP never blocks the stream.
        const xpGain = 1 + (weaknessIdentified ? 0 : 2);
        const streakMilestone = [3, 7, 14, 30, 60, 100].includes(currentStreak) && newLastStreakAt;
        prisma.user.update({
          where: { id: userRecord.id },
          data: { xp: { increment: streakMilestone ? xpGain + 50 : xpGain } },
        }).catch(err => console.error('[chat] XP update failed:', err));

        // Quest check
        const recentAIMsgs = await prisma.message.findMany({
          where: { chatSessionId: session.id, sender: 'AI' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { weaknessIdentified: true },
        });
        let consecutiveClean = 0;
        for (const m of recentAIMsgs) {
          if (m.weaknessIdentified) break;
          consecutiveClean++;
        }
        const sessionMsgCount = await prisma.message.count({
          where: { chatSessionId: session.id, sender: 'USER' },
        });

        const questCompleted = await checkQuestCompletion(userRecord.id, session.id, {
          consecutiveClean,
          sessionMsgCount,
          vocabScore,
          complexityScore,
        });

        const questFinalDepth = questCompleted
          ? Math.min(200, finalDepth + questCompleted.depthReward)
          : finalDepth;

        if (questCompleted) {
          await prisma.user.update({
            where: { id: userRecord.id },
            data: { diveDepth: questFinalDepth },
          });
        }

        // Final stats event
        enqueue(sseEvent('stats', {
          depthDelta,
          currentDepth: questFinalDepth,
          hpDelta,
          currentHP: newHP,
          questCompleted: questCompleted ?? null,
          strengthIdentified: strengthIdentified ?? null,
          userLevel: userLevel ?? null,
          newPersonalBest: newPersonalBestDepth > (userRecord.personalBestDepth ?? 0),
          streakMilestone: [3, 7, 14, 30, 60, 100].includes(currentStreak) && newLastStreakAt ? currentStreak : null,
        }));

        enqueue(sseEvent('done', { success: true }));
      } catch (error) {
        console.error('sendMessageStream error', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        enqueue(sseEvent('error', { error: msg }));
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return stream;
}

// Legacy non-streaming sendMessage was removed — all chat uses sendMessageStream SSE now.

