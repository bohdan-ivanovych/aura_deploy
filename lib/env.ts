import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Primary Cerebras key (Tier 1)
  CEREBRAS_API_KEY: z.string().optional().default(''),
  CEREBRAS_MODEL: z.string().optional().default('qwen-3-235b-a22b-instruct-2507'),
  // Primary Groq key (Tier 2)
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  // Additional Groq keys for fallback rotation (optional)
  GROQ_API_KEY_2: z.string().optional().default(''),
  GROQ_API_KEY_3: z.string().optional().default(''),
  // Groq model to use
  GROQ_MODEL: z.string().optional().default('llama-3.3-70b-versatile'),
  // Gemini fallback — Tier 3 (OpenAI-compatible)
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-2.0-flash'),
  // Azure Speech
  AZURE_SPEECH_KEY: z.string().optional().default(''),
  AZURE_SPEECH_REGION: z.string().optional().default(''),
  // Pusher (real-time)
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional().default(''),
  PUSHER_APP_ID: z.string().optional().default(''),
  PUSHER_SECRET: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function parseEnv() {
  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_API_KEY_2: process.env.GROQ_API_KEY_2,
    GROQ_API_KEY_3: process.env.GROQ_API_KEY_3,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    const missing = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  return result.data;
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
