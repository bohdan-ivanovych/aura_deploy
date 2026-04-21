/**
 * Memory Manager — hierarchical long-term memory for AI personas.
 *
 * Architecture:
 *  - Working memory: last 20 messages (existing, unchanged)
 *  - Episodic memory: AI-compressed ~150-word notes in ChatSession.memoryNotes
 *
 * Update cadence:
 *  - First compression: after 15 messages
 *  - Subsequent: every 25 messages (messagesSinceMemory resets after each update)
 *
 * Usage:
 *  1. Call maybeUpdateMemory(sessionId) after saving each AI reply
 *  2. Call injectMemoryIntoPrompt(sessionId, basePrompt) to build the system prompt
 */

import prisma from '../db/prisma';
import { makeAICompletion } from './multi-groq';

const FIRST_THRESHOLD = 15;
const SUBSEQUENT_THRESHOLD = 25;

const MEMORY_COMPRESSION_PROMPT = `You are a memory extraction system. Read the conversation and extract the 5 most important, specific facts about the USER (not the AI).

Focus on:
- Name, location, job, hobbies, interests
- English learning goals or struggles
- Personal opinions or recurring topics
- Anything the user explicitly stated about themselves

Rules:
- Be specific and factual. No interpretations.
- Max 150 words total.
- Use short bullet points: "• [fact]"
- If there's nothing memorable, write "• No notable facts yet."
- Do NOT include grammar corrections — those are stored separately.`;

export async function maybeUpdateMemory(sessionId: string): Promise<void> {
  // Temporary no-op until Prisma schema includes memoryNotes for ChatSession tier.
  return;
}

async function compressMemory(sessionId: string): Promise<void> {
  // Fetch the last 40 messages for compression context
  const messages = await prisma.message.findMany({
    where: { chatSessionId: sessionId, isHiddenFromChat: false },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: { text: true, sender: true },
  });
  messages.reverse();

  if (messages.length === 0) return;

  const conversationText = messages
    .map(m => `${m.sender === 'USER' ? 'User' : 'AI'}: ${m.text}`)
    .join('\n');

  const notes = await makeAICompletion({
    messages: [
      { role: 'system', content: MEMORY_COMPRESSION_PROMPT },
      { role: 'user', content: `<conversation>\n${conversationText}\n</conversation>\n\nExtract facts now:` },
    ],
    maxTokens: 200,
    temperature: 0.3, // low temperature for factual extraction
    timeoutMs: 15_000,
  });

  // Schema memory fields temporarily removed
  // await prisma.chatSession.update({ ... });

  console.log(`[memory-manager] Compressed memory for session ${sessionId.slice(0, 8)}...`);
}

/**
 * Returns a memory injection string to prepend to the system prompt.
 * Returns empty string if no memory exists yet.
 */
export async function getMemoryContext(sessionId: string): Promise<string> {
  // Temporary no-op until memoryNotes exists on schema
  return '';
}

/**
 * Synchronous version: build from cached notes already fetched elsewhere.
 * Use this when you already have the session data to avoid an extra DB call.
 */
export function buildMemoryContext(memoryNotes: string | null | undefined): string {
  if (!memoryNotes) return '';
  return `[LONG-TERM MEMORY — Facts about this user from previous conversations]\n${memoryNotes}\n[END MEMORY]\n`;
}
