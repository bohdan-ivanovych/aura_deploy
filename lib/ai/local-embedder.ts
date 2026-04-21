import { pipeline, env } from '@xenova/transformers';

// Skip local checks so it fetches from HuggingFace exactly once and caches in node_modules/.cache
env.allowLocalModels = false;
env.useBrowserCache = false; 

// We maintain a global variable across Next.js hot-reloads to prevent memory bloat and multiple instantiation
declare global {
  var _embedderPipeline: Promise<any> | undefined;
}

export async function getEmbedder() {
  if (!globalThis._embedderPipeline) {
    console.log('[Embedder] Initializing Xenova/all-MiniLM-L6-v2 pipeline...');
    globalThis._embedderPipeline = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return globalThis._embedderPipeline;
}

/**
 * Generate a 384-dimensional vector representation for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  
  // The 'mean' pooling and 'normalize' true give us robust cosine-similarity friendly vectors.
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}
