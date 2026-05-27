import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getGroqClient } from '@/lib/ai/groq';
import { GRAMMAR_NODES, normalizeSkillTopic, titleFromSkillTopic } from '@/lib/game/grammar-nodes';
import { getTheory } from '@/lib/game/skill-theory';
import { env } from '@/lib/env';

type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

function fallbackQuestions(topicTitle: string): QuizQuestion[] {
  return [
    {
      question: `Which sentence best shows clear and correct use of ${topicTitle}?`,
      options: [
        'A. I want know this thing.',
        'B. Could you explain this point more clearly?',
        'C. Why this is work?',
        'D. Tell me the answer fast.',
      ],
      correct: 1,
      explanation: 'A clear question uses correct word order and gives enough context.',
    },
    {
      question: 'Which question is the most precise?',
      options: [
        'A. What about it?',
        'B. Why?',
        'C. Which part of my sentence sounds unnatural?',
        'D. Is it good?',
      ],
      correct: 2,
      explanation: 'Precise questions name the exact thing you want feedback on.',
    },
    {
      question: 'Choose the best follow-up question.',
      options: [
        'A. Can you give me one example?',
        'B. You understand?',
        'C. Again.',
        'D. What is all?',
      ],
      correct: 0,
      explanation: 'A good follow-up asks for a specific next step, like an example.',
    },
    {
      question: 'Which version is grammatically strongest?',
      options: [
        'A. I am not sure what does this mean.',
        'B. I am not sure what this means.',
        'C. I not sure what this means.',
        'D. I am not sure what means this.',
      ],
      correct: 1,
      explanation: 'In embedded questions, use statement word order: "what this means."',
    },
    {
      question: 'What makes a question easier to answer?',
      options: [
        'A. Adding the exact problem and context.',
        'B. Making it shorter no matter what.',
        'C. Avoiding punctuation.',
        'D. Asking three unrelated things at once.',
      ],
      correct: 0,
      explanation: 'Context and a clear target help the other person answer usefully.',
    },
  ];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Quiz generation timed out')), timeoutMs);
    }),
  ]);
}

export async function POST(req: Request) {
  let fallbackTitle = 'This Skill';
  let fallbackSlug = 'fallback-skill';
  try {
    const user = await getOrCreateUser();
    const allowed = await rateLimit(`quiz:${user.id}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const body = await req.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

    const normalizedSlug = normalizeSkillTopic(slug);
    const node = GRAMMAR_NODES.find((n) => n.slug === normalizedSlug || n.slug === slug);
    const dynamicTitle = typeof body?.title === 'string' && body.title.trim()
      ? body.title.trim()
      : titleFromSkillTopic(slug);
    const topicTitle = node?.title ?? dynamicTitle;
    fallbackTitle = topicTitle;
    fallbackSlug = node?.slug ?? normalizedSlug;

    const groq = getGroqClient();
    const theory = node ? getTheory(node.slug) : null;
    const contextRules = theory?.rules?.slice(0, 3).join('. ') ?? '';
    const contextExamples = theory?.examples?.slice(0, 3).join('. ') ?? '';

    const questionCount = Math.floor(Math.random() * 6) + 5;

    const prompt = `Generate ${questionCount} challenging multiple-choice quiz questions to test DEEP understanding of "${topicTitle}" in English grammar and communication.

${contextRules ? `Rules: ${contextRules}` : ''}
${contextExamples ? `Examples: ${contextExamples}` : ''}

DIFFICULTY REQUIREMENTS — very important:
- At least 40% of questions must be HARD: subtle distinctions, tricky edge cases, commonly confused forms.
- Wrong options must be plausible — avoid obviously wrong distractors. All 4 options should look like they COULD be correct.
- DO NOT test basic recognition. Test application in context, time expressions, aspect distinctions, and nuance.
- Include at least 2 questions where students must choose between two nearly identical-looking options.
- Vary the question format: gap-fill, error correction, choosing the right tense, identifying meaning difference.
- Randomize which index (0-3) is the correct answer across questions.

Return ONLY a JSON array of exactly ${questionCount} question objects. No extra text.
Each object must have this exact structure:
{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct":0,"explanation":"..."}

"correct" is the index (0-3) of the correct option.`;

    const completion = await withTimeout(groq.chat.completions.create({
      model: env.GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.7,
    }), 18_000);

    const raw = completion.choices[0]?.message?.content ?? '[]';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in AI response');

    const cleaned = jsonMatch[0].replace(/,\s*([\]}])/g, '$1');
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format');
    }

    return NextResponse.json({
      questions,
      nodeTitle: topicTitle,
      nodeSlug: node?.slug ?? normalizedSlug,
      total: questions.length,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({
      questions: fallbackQuestions(fallbackTitle),
      nodeTitle: fallbackTitle,
      nodeSlug: fallbackSlug,
      total: 5,
      fallback: true,
    });
  }
}
