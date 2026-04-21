import { NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';
import { getOrCreateUser } from '@/lib/auth/api-utils';

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { word } = await req.json();

    if (!word || word.trim().length < 2) {
      return NextResponse.json({ suggestion: null });
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a smart flashcard assistant. The user provides an English word or phrase. 
You MUST provide a short, direct translation to Ukrainian inside "back". DO NOT simply copy the English word.
Return ONLY JSON: {"back": "translation in Ukrainian", "englishExplanation": "short 1-sentence English definition"}. Do not return anything else.`
        },
        {
          role: 'user',
          content: word
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No completion content');
    
    const parsed = JSON.parse(content);
    return NextResponse.json({ suggestion: parsed });
  } catch (error) {
    console.error('Suggest flashcard error:', error);
    return NextResponse.json({ error: 'Failed to suggest' }, { status: 500 });
  }
}
