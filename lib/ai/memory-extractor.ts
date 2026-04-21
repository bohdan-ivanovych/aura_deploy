import { makeAIJsonCompletion } from './multi-groq';
import prisma from '@/lib/db/prisma';

export interface FactExtractionResult {
  facts: {
    fact: string;
    isGlobal: boolean;
  }[];
}

const EXTRACTION_PROMPT = `
You are a Memory Extractor AI. Your job is to read the user's message and extract concrete, long-term facts about them.

Rules:
1. ONLY extract meaningful, persistent facts (e.g. "User is from Paris", "User works as an engineer", "User loves dogs", "User's name is John").
2. DO NOT extract conversational filler or temporary states (e.g. "User is tired today", "User liked the joke").
3. Format each fact as a standalone, 3rd-person declarative sentence: "User has a golden retriever".
4. Classify 'isGlobal': true if the fact is a core personal data point (name, location, job, core hobbies) that all Personas should know. false if it's highly contextual to this specific conversation.
5. If there are NO facts to extract, return an empty array.

Return EXACTLY this JSON format:
{
  "facts": [
    { "fact": "User works at Microsoft", "isGlobal": true }
  ]
}
`;

/**
 * Executes a completely detached background promise to extract facts and seamlessly
 * store them in PGVector using our local Xenova embedding model.
 */
export async function backgroundMemoryExtraction(params: {
  text: string;
  userId: string;
  personaId: string;
}) {
  try {
    // 1. Ask Groq (fast, cheap) to extract facts
    const extraction = await makeAIJsonCompletion<FactExtractionResult>({
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: params.text },
      ],
      temperature: 0.2, // low temp for extraction
      maxTokens: 200,
    });

    if (!extraction.facts || extraction.facts.length === 0) {
      return; // Nothing to remember
    }

    // 2. Loop through each extracted fact, generate embedding vector, and insert to Prisma
    for (const item of extraction.facts) {
      console.log(`[Memory Extractor] Learned: "${item.fact}" (isGlobal: ${item.isGlobal})`);

      const embedTimer = Date.now();
      const { generateEmbedding } = await import('./local-embedder');
      const vector = await generateEmbedding(item.fact);
      console.log(`[Memory Extractor] Gemini Embedding took ${Date.now() - embedTimer}ms (768 dimensions)`);

      // Cast the number[] directly to string format PGVector accepts: '[0.1, 0.2, ...]'
      // To prevent SQL injection we pass the raw string into a ::vector cast safely,
      // but Prisma's $executeRaw takes template literal variables safely.
      const vectorString = `[${vector.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "UserMemory" ("id", "userId", "personaId", "content", "isGlobal", "embedding")
        VALUES (
          gen_random_uuid()::text, 
          ${params.userId}, 
          ${params.personaId}, 
          ${item.fact}, 
          ${item.isGlobal}, 
          ${vectorString}::vector
        )
      `;
    }
  } catch (err) {
    console.error('[Memory Extractor] Background process failed:', err);
  }
}
