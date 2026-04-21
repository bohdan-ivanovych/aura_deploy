import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await getOrCreateUser();

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: (user as any).username ?? null,
        nativeLanguage: user.nativeLanguage,
        cardPreference: user.cardPreference,
        explanationLanguage: user.explanationLanguage,
        magicWord: user.magicWord,
        targetAccent: user.targetAccent ?? 'us',
        referralCode: (user as any).referralCode ?? null,
        stealthInjectVocab: (user as any).stealthInjectVocab ?? false,
        stealthInjectGrammar: (user as any).stealthInjectGrammar ?? false,
      },
    });
  } catch (error) {
    console.error('settings GET error', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await getOrCreateUser();

    const allowedPrefs = ['translation', 'explanation', 'both'] as const;
    const incomingPref: string | undefined = body.cardPreference;
    const cardPreference = allowedPrefs.includes(incomingPref as any)
      ? incomingPref
      : undefined;

    const allowedLangs = ['native', 'english'] as const;
    const incomingLang: string | undefined = body.explanationLanguage;
    const explanationLanguage = allowedLangs.includes(incomingLang as any)
      ? incomingLang
      : undefined;

    const allowedAccents = ['us', 'gb'] as const;
    const incomingAccent: string | undefined = body.targetAccent;
    const targetAccent = allowedAccents.includes(incomingAccent as any)
      ? incomingAccent
      : undefined;

    if (typeof body.username === 'string') {
      const raw = body.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (raw && raw !== (user as any).username) {
        const taken = await prisma.user.findUnique({ where: { username: raw } });
        if (taken && taken.id !== user.id) {
          return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        nativeLanguage: typeof body.nativeLanguage === 'string' && body.nativeLanguage.trim()
          ? body.nativeLanguage.trim()
          : user.nativeLanguage,
        ...(cardPreference ? { cardPreference } : {}),
        ...(explanationLanguage ? { explanationLanguage } : {}),
        magicWord: typeof body.magicWord === 'string' && body.magicWord.trim()
          ? body.magicWord.trim()
          : user.magicWord,
        ...(targetAccent ? { targetAccent } : {}),
        ...(typeof body.username === 'string' ? {
          username: body.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
        } : {}),
        ...(typeof body.name === 'string' && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.stealthInjectVocab === 'boolean' ? { stealthInjectVocab: body.stealthInjectVocab } : {}),
        ...(typeof body.stealthInjectGrammar === 'boolean' ? { stealthInjectGrammar: body.stealthInjectGrammar } : {}),
      } as any,
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        username: (updated as any).username ?? null,
        nativeLanguage: updated.nativeLanguage,
        cardPreference: updated.cardPreference,
        explanationLanguage: updated.explanationLanguage,
        magicWord: updated.magicWord,
        targetAccent: (updated as any).targetAccent ?? 'us',
      },
    });
  } catch (error) {
    console.error('settings POST error', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to save settings' }, { status: 500 });
  }
}

