"use server";

import prisma from '@/lib/db/prisma';
import { mapWeaknessToNodeSlug } from '@/lib/game/grammar-nodes';
import { checkMessageLimit, incrementMessageCount } from '@/lib/auth/subscription';

import { CHAT_MAX_CONTEXT_MESSAGES as MAX_CONTEXT_MESSAGES, CHAT_MAX_COMPLETION_TOKENS as MAX_COMPLETION_TOKENS } from '@/src/config/gameplayConfig';

import { calculateDepth, calculateStreak } from '@/lib/game/mechanics';
import { checkQuestCompletion, QuestCheckParams, generateBonusQuest } from '@/lib/game/quests';
import { calculateCEFRLevel, calculateRollingAverage, clampScore } from '@/lib/services/user-stats';
import { generateChatResponse } from '@/lib/ai/chat-engine';
import { processShortVideo, ShortVideoContext, ShortVideoPlatform } from '@/lib/ai/video-processor';
import { logDev } from '@/lib/utils/logger';


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
  isShortVideo?: boolean,
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
        const [userRecord, recentWeaknesses, activeQuests] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId! } })
            .then(u => u ?? prisma.user.create({
              data: { id: userId!, email: `anon_${userId}@aura.local`, name: 'Anonymous' },
            })),
          prisma.grammarWeakness.findMany({
            where: { userId: userId! },
            orderBy: { lastSeen: 'desc' },
            take: 10,
          }),
          prisma.userQuest.findMany({
            where: { userId: userId!, completed: false },
            include: { quest: true },
            take: 5,
          }),
        ]);

        // ── Daily message limit ─────────────────────────────────────────────
        const { allowed, remaining, isPro } = await checkMessageLimit(userRecord.id);
        if (!allowed) {
          // FIX: send a structured SSE error so the client can call setLimitReached(true)
          // instead of showing a generic "Stream error" toast
          enqueue(sseEvent('limit_reached', {
            error: 'DAILY_LIMIT_REACHED',
            remaining: 0,
            isPro: false,
            message: "You've reached your 20 messages for today. Upgrade to Aura Pro for unlimited chats.",
          }));
          controller.close();
          return;
        }

        // Find or create persona
        let persona = personaId
          ? await prisma.persona.findUnique({ where: { id: personaId } })
          : await prisma.persona.findFirst({ where: { creatorId: userRecord.id }, orderBy: { name: 'asc' } });
        if (!persona) {
          persona = await prisma.persona.create({
            data: { name: 'Alex', description: 'Curious, opinionated friend', systemPrompt: null, isPublic: false },
          });
        }

        // Find or create session
        let session: { id: string } | null = chatSessionId
          ? await prisma.chatSession.findUnique({ where: { id: chatSessionId } })
          : null;

        if (!session) {
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

        incrementMessageCount(userRecord.id).catch(err =>
          console.error('[chat] Failed to increment message count:', err)
        );

        enqueue(sseEvent('session', { sessionId: session.id, userMsgId: userMsg.id }));

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

        let reactionInject = '';
        if (lastAIWithReaction?.reaction) {
          reactionInject = `[System info: The user reacted with ${lastAIWithReaction.reaction} to your previous message. Let this subtly inform your tone in the next reply — do not announce the reaction, just reflect it naturally.]\n`;
          await prisma.message.update({
            where: { id: lastAIWithReaction.id },
            data: { reaction: null },
          });
        }

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
              orderBy: { nextReview: 'asc' },
            });
            if (flashcard) {
              directives.push(`Use the word '${flashcard.front}' (or its native translation: '${flashcard.back}') naturally.`);
            }
          }
          if ((userRecord as any).stealthInjectGrammar) {
            const activeProgresses = await prisma.userSkillProgress.findMany({
              where: { userId: userRecord.id, practiced: { gt: 0 } },
              orderBy: { updatedAt: 'desc' },
              take: 10,
            });
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

        const lastAIAttempt = await prisma.message.findFirst({
          where: { chatSessionId: session.id, sender: 'AI', stealthTarget: { not: null } },
          orderBy: { createdAt: 'desc' },
        });
        const prevStealthTarget = lastAIAttempt?.stealthTarget;

        // ── Short-Video: Unified Multimodal Context Fetching ──────────────────
        let shortVideoContext: ShortVideoContext | null = null;
        const _isShortVideo = !!isTikTok || !!isShortVideo;

        if (_isShortVideo) {
          const shortsMatch = text.match(
            /https?:\/\/(?:www\.)?(?:youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+)\S*/i,
          );
          const reelsMatch = text.match(
            /https?:\/\/(?:www\.)?instagram\.com\/(?:reels?|p)\/[\w-]+\/?/i,
          );
          const tiktokMatch = text.match(
            /https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/\S+/i,
          );

          let platform: ShortVideoPlatform = 'tiktok';
          let videoUrl = text.trim().split('?')[0];

          if (shortsMatch) {
            platform = 'shorts';
            videoUrl = shortsMatch[0].split('?')[0];
          } else if (reelsMatch) {
            platform = 'reels';
            videoUrl = reelsMatch[0].split('?')[0];
          } else if (tiktokMatch) {
            platform = 'tiktok';
            videoUrl = tiktokMatch[0].split('?')[0];
          }

          shortVideoContext = await Promise.race([
            processShortVideo(platform, videoUrl, null).catch(() => null),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 12_000)),
          ]);

          enqueue(sseEvent('watching_done', { success: true }));
        }

        const { bubbles, parsedMeta } = await generateChatResponse({
          text,
          history,
          persona,
          userRecord: {
            nativeLanguage: userRecord.nativeLanguage,
            explanationLanguage: userRecord.explanationLanguage,
            diveDepth: userRecord.diveDepth,
          },
          reactionInject,
          weaknessSummary,
          memoryContext: stealthDirective,
          activeQuests: activeQuests.map(uq => ({
            id: uq.quest.id,
            title: uq.quest.title,
            description: uq.quest.description,
            progress: uq.progress || 0,
          })),
          isShortVideo: _isShortVideo,
          shortVideoContext,
          stealthTargets: { prevStealthTarget },
        });

        logDev('Actions:Chat', 'Generated response:', { bubbles, parsedMeta });

        const {
          grammarCorrection = null,
          weaknessIdentified: rawWeakness = null,
          strengthIdentified = null,
          vocabularyNote = null,
          vibeNote = null,
          suggestion = null,
          errorSpan = null,
          levelAdjustment: rawAdj = 0,
          vocabScore: rawVocab,
          complexityScore: rawComplex,
          fluencyScore: rawFluency,
          grammarScore: rawGrammar,
          accuracyScore: rawAccuracy,
        } = parsedMeta;

        // FIX: extract completedQuestIds AFTER normalising the type, not before.
        // Doing `const { completedQuestIds = [] } = parsedMeta` before this guard
        // meant the local variable kept the bad value even after parsedMeta was mutated.
        const rawCompletedQuestIds = parsedMeta.completedQuestIds;
        const completedQuestIds: string[] = Array.isArray(rawCompletedQuestIds)
          ? rawCompletedQuestIds
          : [];

        const weaknessIdentified =
          rawWeakness && String(rawWeakness).trim().toLowerCase() !== 'none'
            ? rawWeakness
            : null;

        const levelAdjustment = Math.max(-2, Math.min(2, Math.round(Number(rawAdj) || 0)));

        const vocabScore = clampScore(rawVocab);
        const complexityScore = clampScore(rawComplex);
        const fluencyScore = clampScore(rawFluency);
        const grammarScore = clampScore(rawGrammar);
        const accuracyScore = clampScore(rawAccuracy);

        const now = new Date();
        const withoutEmoji = text.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, '').trim();
        const realWords = withoutEmoji.split(/\s+/).filter(w => /[a-zA-Z\u0400-\u04FF]/.test(w));
        const isMeaningful = realWords.length >= 2;
        const skipGrammar = realWords.length === 0;

        const { finalDepth, depthDelta } = calculateDepth(
          userRecord.diveDepth ?? 0,
          userRecord.lastActiveAt ? new Date(userRecord.lastActiveAt) : null,
          now,
          isMeaningful,
          levelAdjustment,
        );

        const updatedVocab = calculateRollingAverage(userRecord.avgVocabulary, vocabScore);
        const updatedComplexity = calculateRollingAverage(userRecord.avgComplexity, complexityScore);
        const updatedFluency = calculateRollingAverage(userRecord.avgFluency, fluencyScore);
        const updatedGrammar = calculateRollingAverage(userRecord.avgGrammar, grammarScore);
        const updatedAccuracy = calculateRollingAverage(userRecord.avgAccuracy, accuracyScore);

        const totalMsgs = await prisma.message.count({ where: { chatSessionId: session.id, sender: 'AI' } });
        const totalErrors = await prisma.message.count({
          where: { chatSessionId: session.id, sender: 'AI', weaknessIdentified: { not: null } },
        });
        const errorRate = totalMsgs > 0 ? totalErrors / totalMsgs : 0;

        let userLevel: string | null = null;
        if (updatedVocab !== null && updatedComplexity !== null && updatedFluency !== null) {
          userLevel = calculateCEFRLevel(finalDepth, errorRate, updatedVocab, updatedComplexity, updatedFluency);
        }

        const { newStreak: currentStreak, newLastStreakAt } = calculateStreak(
          userRecord.streak ?? 0,
          userRecord.lastStreakAt ? new Date(userRecord.lastStreakAt) : null,
          now,
        );

        const newPersonalBestDepth = finalDepth > (userRecord.personalBestDepth ?? 0)
          ? finalDepth
          : (userRecord.personalBestDepth ?? 0);

        const rawErrorSpan = errorSpan && typeof errorSpan === 'object'
          && typeof (errorSpan as any).original === 'string'
          && typeof (errorSpan as any).corrected === 'string'
          && (errorSpan as any).original.trim().length > 0
          ? { original: (errorSpan as any).original.trim(), corrected: (errorSpan as any).corrected.trim() }
          : null;

        const validErrorSpan = rawErrorSpan && !skipGrammar && text.includes(rawErrorSpan.original)
          ? rawErrorSpan
          : null;

        if (validErrorSpan) {
          await prisma.message.update({
            where: { id: userMsg.id },
            data: { errorSpan: validErrorSpan },
          });
        }

        const finalXPReward = weaknessIdentified ? 0 : (
          ((vocabScore && vocabScore >= 75) || (complexityScore && complexityScore >= 75) || strengthIdentified) ? 2 : 1
        );

        enqueue(sseEvent('user_update', {
          userMsgId: userMsg.id,
          errorSpan: validErrorSpan,
          xpReward: finalXPReward,
        }));

        // Save and emit bubbles
        const savedBubbles: Array<{ id: string; text: string }> = [];

        for (let i = 0; i < bubbles.length; i++) {
          const bubbleText = bubbles[i];
          const isLastBubble = i === bubbles.length - 1;

          enqueue(sseEvent('typing_indicator', { bubbleIndex: i }));

          const typingDelay = Math.min(2200, Math.max(600, bubbleText.length * 8));
          await new Promise(r => setTimeout(r, typingDelay));

          const shouldReply = i === 0 && Math.random() < 0.22;

          const aiMsg = await prisma.message.create({
            data: {
              text: bubbleText,
              sender: 'AI',
              chatSessionId: session.id,
              senderPersonaId: persona.id,
              replyToId: shouldReply ? userMsg.id : null,
              grammarCorrection: isLastBubble && !skipGrammar && grammarCorrection ? String(grammarCorrection) : null,
              weaknessIdentified: isLastBubble && !skipGrammar && weaknessIdentified ? String(weaknessIdentified) : null,
              vocabularyNote: isLastBubble && !skipGrammar && vocabularyNote ? String(vocabularyNote) : null,
              vibeNote: isLastBubble && vibeNote ? String(vibeNote) : null,
              xpReward: isLastBubble ? finalXPReward : 0,
              stealthTarget: isLastBubble && stealthGrammarTargetSlug ? stealthGrammarTargetSlug : null,
            },
          });

          savedBubbles.push({ id: aiMsg.id, text: bubbleText });

          enqueue(sseEvent('message', {
            id: aiMsg.id,
            text: bubbleText,
            sender: 'AI',
            senderPersonaId: persona.id,
            senderName: persona.name,
            senderAvatar: persona.avatarUrl,
            grammarCorrection: isLastBubble && !skipGrammar ? (grammarCorrection ?? null) : null,
            weaknessIdentified: isLastBubble && !skipGrammar ? (weaknessIdentified ?? null) : null,
            vocabularyNote: isLastBubble && !skipGrammar ? (vocabularyNote ?? null) : null,
            vibeNote: isLastBubble ? (vibeNote ?? null) : null,
            xpReward: isLastBubble ? finalXPReward : 0,
            suggestion: isLastBubble ? (suggestion ?? null) : null,
            errorSpan: isLastBubble ? validErrorSpan : null,
            replyTo: shouldReply ? { id: userMsg.id, text: userMsg.text, sender: 'USER' } : null,
            bubbleIndex: i,
            isLastBubble,
            createdAt: aiMsg.createdAt,
          }));
        }

        // ── DB updates ────────────────────────────────────────────────────────
        const streakMilestone = [3, 7, 14, 30, 60, 100].includes(currentStreak) && !!newLastStreakAt;

        // FIX: removed the duplicate fire-and-forget diveDepth increment that caused
        // race conditions. All depth math is resolved here and written once.
        const depthGain = 1 + (weaknessIdentified ? 0 : 2);
        const baseNewDepth = Math.min(200, finalDepth + (streakMilestone ? depthGain + 50 : depthGain));

        const updatePromises: Promise<unknown>[] = [
          prisma.user.update({
            where: { id: userRecord.id },
            data: {
              diveDepth: baseNewDepth,
              maxDiveDepth: baseNewDepth > (userRecord.maxDiveDepth ?? 0) ? baseNewDepth : undefined,
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
            data: { metrics: { vocabScore, complexityScore, fluencyScore, grammarScore, accuracyScore } },
          }),
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
          if (prevStealthTarget) {
            updatePromises.push(
              prisma.userSkillProgress.upsert({
                where: { userId_nodeSlug: { userId: userRecord.id, nodeSlug: prevStealthTarget } },
                update: { practiced: { increment: 1 }, correct: { increment: 3 } },
                create: { userId: userRecord.id, nodeSlug: prevStealthTarget, practiced: 1, correct: 3 },
              }).catch(err => console.error('Failed to upsert synergy bonus:', err))
            );
          } else {
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
                  data: { correct: { increment: 1 } },
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

        if (!skipGrammar && weaknessIdentified) {
          generateBonusQuest(userRecord.id, String(weaknessIdentified)).catch(err =>
            console.error('[chat] Background quest generation failed:', err)
          );
        }

        // Process LLM-returned quest completions
        let questCompletions: Array<{ title: string; depthReward: number }> = [];
        if (completedQuestIds.length > 0) {
          for (const questId of completedQuestIds) {
            const activeUq = activeQuests.find(uq => uq.quest.id === questId);
            if (activeUq && !activeUq.completed) {
              const depthReward = Math.max(1, Math.ceil(activeUq.quest.xp / 10));
              await prisma.userQuest.update({
                where: { id: activeUq.id },
                data: { completed: true, completedAt: new Date() },
              });
              questCompletions.push({ title: activeUq.quest.title, depthReward });
            }
          }
        }

        // Server-side: auto-increment progress for message-count quests
        for (const uq of activeQuests) {
          if (uq.completed) continue;
          const desc = uq.quest.description.toLowerCase();
          if (desc.includes('send') && (desc.includes('message') || desc.includes('messages'))) {
            const numMatch = uq.quest.description.match(/\b(\d+)\b/);
            if (numMatch) {
              const target = parseInt(numMatch[1], 10);
              const freshUq = await prisma.userQuest.findUnique({
                where: { id: uq.id },
                select: { progress: true, completed: true },
              });
              if (!freshUq || freshUq.completed) continue;
              const newProgress = (freshUq.progress || 0) + 1;
              if (newProgress >= target) {
                const depthReward = Math.max(1, Math.ceil(uq.quest.xp / 10));
                await prisma.userQuest.update({
                  where: { id: uq.id },
                  data: { completed: true, completedAt: new Date(), progress: target },
                });
                questCompletions.push({ title: uq.quest.title, depthReward });
              } else {
                await prisma.userQuest.update({
                  where: { id: uq.id },
                  data: { progress: newProgress },
                });
              }
            }
          }
        }

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

        const allQuestCompletions = [...questCompletions];
        if (questCompleted) allQuestCompletions.push(questCompleted);

        const totalDepthReward = allQuestCompletions.reduce((sum, q) => sum + q.depthReward, 0);
        const questFinalDepth = totalDepthReward > 0
          ? Math.min(200, baseNewDepth + totalDepthReward)
          : baseNewDepth;

        if (totalDepthReward > 0) {
          await prisma.user.update({
            where: { id: userRecord.id },
            data: { diveDepth: questFinalDepth },
          });
        }

        // Skill tree update every 5 messages
        const sessionMsgCountForSkill = await prisma.message.count({
          where: { chatSessionId: session.id, sender: 'USER' },
        });
        if (sessionMsgCountForSkill > 0 && sessionMsgCountForSkill % 5 === 0) {
          const qualityScore = Math.round(
            ((vocabScore ?? 60) + (grammarScore ?? 60) + (fluencyScore ?? 60)) / 3
          );
          const delta = Math.max(1, Math.min(15, Math.round((qualityScore / 100) * 15)));

          const activeSkillNodes = await prisma.userSkillProgress.findMany({
            where: { userId: userRecord.id, practiced: { gt: 0 } },
            take: 10,
            orderBy: { updatedAt: 'desc' },
          });

          if (activeSkillNodes.length > 0) {
            await Promise.all(
              activeSkillNodes.slice(0, 3).map(node =>
                prisma.userSkillProgress.update({
                  where: { userId_nodeSlug: { userId: userRecord.id, nodeSlug: node.nodeSlug } },
                  data: { correct: { increment: delta } },
                }).catch(() => null)
              )
            );
          }

          enqueue(sseEvent('skill_tree_updated', { delta, sessionMsgCount: sessionMsgCountForSkill }));
        }

        enqueue(sseEvent('stats', {
          depthDelta,
          currentDepth: questFinalDepth,
          questCompleted: allQuestCompletions.length > 0 ? allQuestCompletions[0] : null,
          strengthIdentified: strengthIdentified ?? null,
          userLevel: userLevel ?? null,
          newPersonalBest: newPersonalBestDepth > (userRecord.personalBestDepth ?? 0),
          streakMilestone: streakMilestone ? currentStreak : null,
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