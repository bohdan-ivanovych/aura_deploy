/**
 * Embedding generator using Gemini text-embedding-004 API.
 *
 * REPLACES: @xenova/transformers local-embedder (~400MB ONNX model)
 * WHY: The Xenova model was the #1 cold-start killer — it downloads a 90MB+
 * ONNX model and adds ~400MB to the serverless function footprint.
 * Gemini's embedding API does the same job in <100ms over HTTP with zero
 * local weight. The app already has GEMINI_API_KEY configured.
 *
 * MIGRATION NOTE: This produces 768-dim vectors (text-embedding-004) vs
 * the old 384-dim vectors (all-MiniLM-L6-v2). Existing UserMemory rows
 * with 384-dim embeddings should be cleared — they're auto-rebuilt from chat.
 */

const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Generate a vector representation for the given text using Gemini API.
 * Returns a 768-dimensional float array suitable for pgvector cosine similarity.
 *
 * Falls back to a zero-vector on failure so chat is never blocked by embedding errors.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Embedder] GEMINI_API_KEY not set, returning zero vector');
    return new Array(768).fill(0);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Embedder] Gemini API error ${res.status}:`, errText);
      return new Array(768).fill(0);
    }

    const data = (await res.json()) as {
      embedding?: { values?: number[] };
    };

    const values = data.embedding?.values;
    if (!values || !Array.isArray(values) || values.length === 0) {
      console.error('[Embedder] Unexpected response shape:', JSON.stringify(data).slice(0, 200));
      return new Array(768).fill(0);
    }

    return values;
  } catch (err) {
    console.error('[Embedder] Gemini embedding failed:', err);
    return new Array(768).fill(0);
  }
}
