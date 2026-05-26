import { NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';

export async function POST(req: Request) {
  try {
    const { userAnswer, correctAnswer } = await req.json();

    if (!userAnswer || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a language learning assistant. Compare the user's answer with the correct answer.
Determine if the user's answer is semantically correct or acceptable, even if not an exact match.
Consider typos, minor variations, and alternative translations.
Return ONLY JSON: {"isCorrect": true/false, "feedback": "brief feedback message"}`
        },
        {
          role: 'user',
          content: `User answer: "${userAnswer}"\nCorrect answer: "${correctAnswer}"`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No completion content');
    
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Check answer error:', error);
    // Fallback to exact match if LLM fails
    const { userAnswer, correctAnswer } = await req.json();
    const isExactMatch = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return NextResponse.json({ 
      isCorrect: isExactMatch, 
      feedback: isExactMatch ? 'Correct!' : 'Incorrect. Try again.' 
    });
  }
}
