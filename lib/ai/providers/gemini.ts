import { env } from '@/lib/env';

export async function callGemini(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 600,
  temperature = 0.85,
  responseFormat?: { type: 'json_object' } | { type: 'text' }
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL;

  if (!apiKey) {
    throw new Error('Gemini API key is missing');
  }

  // Using OpenAI-compatible endpoint for Google AI Studio
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Gemini returned empty content');
  return content;
}
