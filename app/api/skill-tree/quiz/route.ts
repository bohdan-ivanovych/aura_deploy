import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getGroqClient } from '@/lib/ai/groq';
import { GRAMMAR_NODES } from '@/lib/game/grammar-nodes';
import { getTheory } from '@/lib/game/skill-theory';

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const allowed = await rateLimit(`quiz:${user.id}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const body = await req.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

    const node = GRAMMAR_NODES.find((n) => n.slug === slug);
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    const groq = getGroqClient();
    const theory = getTheory(slug);
    const contextRules = theory?.rules?.slice(0, 3).join('. ') ?? '';
    const contextExamples = theory?.examples?.slice(0, 3).join('. ') ?? '';

    const questionCount = Math.floor(Math.random() * 6) + 5;

    const prompt = `Generate ${questionCount} challenging multiple-choice quiz questions to test DEEP understanding of "${node.title}" in English grammar.

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

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.7,
    });

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
      nodeTitle: node.title,
      nodeSlug: slug,
      total: questions.length,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}
