import Groq from 'groq-sdk';
import { env } from '../env';

export const GROQ_MODEL = env.GROQ_MODEL;

export function getGroqApiKeys(): string[] {
  const keys: string[] = [];
  if (env.GROQ_API_KEY) keys.push(env.GROQ_API_KEY);
  if (env.GROQ_API_KEY_2) keys.push(env.GROQ_API_KEY_2);
  if (env.GROQ_API_KEY_3) keys.push(env.GROQ_API_KEY_3);
  if (env.GROQ_API_KEYS) {
    const list = env.GROQ_API_KEYS.split(/[\s,]+/)
      .map(k => k.trim())
      .filter(Boolean);
    keys.push(...list);
  }
  return Array.from(new Set(keys));
}

let _rotatingClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_rotatingClient) {
    const keys = getGroqApiKeys();
    if (keys.length === 0) {
      throw new Error('No Groq API keys configured');
    }

    const clients = keys.map(key => ({
      client: new Groq({ apiKey: key }),
      hint: `...${key.slice(-6)}`,
    }));

    let index = 0;
    const getNextClient = () => {
      const entry = clients[index];
      index = (index + 1) % clients.length;
      return entry;
    };

    const wrap = (path: string[]): any => {
      return new Proxy(() => {}, {
        get(target, prop, receiver) {
          if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
          return wrap([...path, prop]);
        },
        async apply(target, thisArg, args) {
          const errors: any[] = [];
          const poolSize = clients.length;
          
          for (let attempt = 0; attempt < poolSize; attempt++) {
            const { client, hint } = getNextClient();
            try {
              let current: any = client;
              for (const segment of path) {
                current = current[segment];
              }
              return await current.apply(thisArg, args);
            } catch (err: any) {
              console.warn(
                `[groq-rotation] Attempt ${attempt + 1}/${poolSize} failed using key ${hint}:`,
                err?.message || err
              );
              errors.push(err);

              const status = err?.status;
              const isRetryable =
                status === 429 ||
                status >= 500 ||
                err?.message?.toLowerCase().includes('rate_limit') ||
                err?.message?.toLowerCase().includes('timeout') ||
                err?.message?.toLowerCase().includes('timed out');

              if (!isRetryable) {
                throw err;
              }
            }
          }
          throw errors[errors.length - 1];
        },
      });
    };

    _rotatingClient = new Proxy({}, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
        if (prop === 'chat' || prop === 'audio') {
          return wrap([prop]);
        }
        return Reflect.get(clients[0].client, prop, receiver);
      },
    }) as Groq;
  }

  return _rotatingClient;
}
