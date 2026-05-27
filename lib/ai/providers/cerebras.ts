import { env } from '@/lib/env';

export async function callCerebras(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 600,
  temperature = 0.85,
  responseFormat?: { type: 'json_object' } | { type: 'text' },
  apiKey = env.CEREBRAS_API_KEY
): Promise<string> {
  const model = env.CEREBRAS_MODEL;

  if (!apiKey) {
    throw new Error('Cerebras API key is missing');
  }

  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
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
    throw new Error(`Cerebras error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Cerebras returned empty content');
  return content;
}
