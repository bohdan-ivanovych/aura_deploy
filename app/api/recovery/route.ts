import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { getMaxHP } from '@/lib/game/levels';
import { createHmac } from 'crypto';

// ─── Token helpers ────────────────────────────────────────────────────────────
// We sign a challenge token so the client cannot simply POST {correct:true}.
// The token encodes: userId + expiry + expected answers for each challenge.
// Signing key: PUSHER_SECRET (always present in env — reused to avoid new var).

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes to complete the loop

function getSigningKey(): string {
  const key = process.env.PUSHER_SECRET;
  if (!key) throw new Error('Signing key not configured');
  return key;
}

function signToken(payload: object): string {
  const key = getSigningKey();
  const str = JSON.stringify(payload);
  const sig = createHmac('sha256', key).update(str).digest('hex');
  // base64url-encode payload + sig
  return Buffer.from(str).toString('base64url') + '.' + sig;
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const key = getSigningKey();
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const str = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expected = createHmac('sha256', key).update(str).digest('hex');
    // Constant-time comparison to prevent timing attacks
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    const payload = JSON.parse(str) as Record<string, unknown>;
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── GET /api/recovery — Generate signed challenge set ───────────────────────

export async function GET(_req: Request) {
  try {
    const user = await getOrCreateUser();

    const flashcards = await prisma.flashcard.findMany({
      where: { userId: user.id, type: 'trimodal' },
      orderBy: { errorCount: 'desc' },
      take: 10,
    });

    // Cast to any[] — real records have trimodal fields (mistakeSentence etc.) per
    // the Prisma schema; mock cards fill the same shape. Both are safe at runtime.
    let baseCards: any[] = [...flashcards].sort(() => Math.random() - 0.5);

    const MOCK_CARDS = [
      { mistakeSentence: 'I have went to the store.', correctSentence: 'I have gone to the store.', wrongWord: 'went', correctWord: 'gone', distractorWord: 'go', englishExplanation: 'Past participle of go is gone.', judgeIsCorrect: false },
      { mistakeSentence: "She don't know the answer.", correctSentence: "She doesn't know the answer.", wrongWord: "don't", correctWord: "doesn't", distractorWord: 'not', englishExplanation: "3rd person singular uses doesn't.", judgeIsCorrect: true },
      { mistakeSentence: 'I was born at 1999.', correctSentence: 'I was born in 1999.', wrongWord: 'at', correctWord: 'in', distractorWord: 'on', englishExplanation: "Use 'in' for years.", judgeIsCorrect: false },
    ];

    while (baseCards.length < 3) {
      baseCards.push(MOCK_CARDS[baseCards.length] as any);
    }
    baseCards = baseCards.slice(0, 3);

    // Assign modes deterministically (shuffle is fine — the expected answers are
    // what matter, not the mode order).
    const modes: ('sniper' | 'judge' | 'fixer')[] = (['sniper', 'judge', 'fixer'] as const)
      .slice()
      .sort(() => Math.random() - 0.5) as any;

    const challenges = baseCards.map((card, idx) => {
      const mode = modes[idx];
      // Use the stable DB value so it never changes for this specific card
      const judgeIsCorrect = card.judgeIsCorrect ?? false;
      return {
        mode,
        mistakeSentence: card.mistakeSentence,
        correctSentence: card.correctSentence,
        wrongWord: card.wrongWord,
        correctWord: card.correctWord,
        distractorWord: card.distractorWord,
        rule: card.englishExplanation || 'Grammar Rule',
        judgeIsCorrect,
      };
    });

    // Build expected-answer map: for each challenge index, what is the correct answer?
    // Sniper  → wrongWord (the word to tap)
    // Judge   → judgeIsCorrect value (true/false)
    // Fixer   → correctWord (the word to pick)
    const expectedAnswers = challenges.map((c) => {
      if (c.mode === 'sniper') return { mode: c.mode, answer: c.wrongWord };
      if (c.mode === 'judge')  return { mode: c.mode, answer: c.judgeIsCorrect };
      return { mode: c.mode, answer: c.correctWord }; // fixer
    });

    const token = signToken({
      userId: user.id,
      exp: Date.now() + TOKEN_TTL_MS,
      answers: expectedAnswers,
    });

    return NextResponse.json({ questions: challenges, token });
  } catch (err) {
    console.error('recovery GET error', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ─── POST /api/recovery — Validate token + answers, then restore HP ──────────

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json().catch(() => ({})) as {
      token?: string;
      answers?: Array<{ mode: string; answer: unknown }>;
    };

    const { token, answers } = body;

    if (!token || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid request: token and answers are required.' },
        { status: 400 }
      );
    }

    // 1. Verify the signed token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge token. Please start a new recovery session.' },
        { status: 403 }
      );
    }

    // 2. Ensure the token belongs to this exact user (prevents token sharing)
    if (payload.userId !== user.id) {
      return NextResponse.json({ error: 'Token user mismatch.' }, { status: 403 });
    }

    // 3. Compare submitted answers against the signed expected answers
    const expectedAnswers = payload.answers as Array<{ mode: string; answer: unknown }>;
    if (!Array.isArray(expectedAnswers) || answers.length !== expectedAnswers.length) {
      return NextResponse.json({ error: 'Answer count mismatch.' }, { status: 400 });
    }

    for (let i = 0; i < expectedAnswers.length; i++) {
      const expected = expectedAnswers[i];
      const submitted = answers[i];
      if (!submitted || submitted.mode !== expected.mode) {
        return NextResponse.json(
          { error: `Challenge ${i + 1} mode mismatch.` },
          { status: 400 }
        );
      }
      // Strict equality. For judge mode this compares booleans; for others, strings.
      if (String(submitted.answer).toLowerCase() !== String(expected.answer).toLowerCase()) {
        return NextResponse.json(
          { restored: false, error: `Wrong answer for challenge ${i + 1}.` },
          { status: 200 }
        );
      }
    }

    // 4. All 3 answers correct — restore full HP
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { diveDepth: true },
    });
    const maxHP = getMaxHP(current?.diveDepth ?? 0);

    await prisma.user.update({
      where: { id: user.id },
      data: { currentHP: maxHP },
    });

    return NextResponse.json({ restored: true, newHP: maxHP });
  } catch (err) {
    console.error('recovery POST error', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

