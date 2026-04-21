import Groq from 'groq-sdk';
import { env } from '../env';

export const GROQ_MODEL = env.GROQ_MODEL;

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return _client;
}
