'use server';

import { cookies, headers } from 'next/headers';
import prisma from '@/lib/db/prisma';

const BROWSER_LANG_MAP: Record<string, string> = {
  'uk': 'uk', 'ru': 'ru', 'pl': 'pl', 'de': 'de', 'fr': 'fr',
  'es': 'es', 'it': 'it', 'pt': 'pt', 'tr': 'tr',
  'ja': 'ja', 'zh': 'zh', 'ko': 'ko', 'hi': 'hi',
  'ar': 'ar', 'nl': 'nl', 'sv': 'sv', 'no': 'no',
  'da': 'da', 'fi': 'fi', 'el': 'el', 'cs': 'cs',
  'ro': 'ro', 'hu': 'hu', 'id': 'id', 'vi': 'vi',
  'th': 'th', 'he': 'he', 'fa': 'fa', 'en': 'en',
};

function detectNativeLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'en';
  const parts = acceptLanguage.split(',').map(p => p.trim());
  for (const part of parts) {
    const lang = part.split(';')[0].trim().toLowerCase();
    if (BROWSER_LANG_MAP[lang]) return BROWSER_LANG_MAP[lang];
    const prefix = lang.split('-')[0];
    if (BROWSER_LANG_MAP[prefix]) return BROWSER_LANG_MAP[prefix];
  }
  return 'en';
}

export async function getCurrentUser(refCode?: string) {
  const cookieStore = await cookies();
  // The edge proxy (proxy.ts) guarantees this cookie is set before
  // any Server Component renders, so we only need to read it here.
  let userId = cookieStore.get('user-id')?.value;

  // Fallback: should never happen in production (proxy covers it),
  // but generates a stable-enough ID for local dev without the proxy.
  if (!userId) {
    userId = crypto.randomUUID();
  }


  const acceptLanguage = (await headers()).get('accept-language');

  try {
    let user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@aura.os`,
        name: null,
        nativeLanguage: detectNativeLanguage(acceptLanguage),
        cardPreference: 'both',
        explanationLanguage: 'native',
        magicWord: 'explain',
        targetAccent: 'us',
        xp: 0,
        diveDepth: 0,
        maxDiveDepth: 0,
        streak: 0,
        avgVocabulary: 50,
        avgComplexity: 50,
        avgFluency: 50,
        lastActiveAt: new Date(),
      },
    });

    // Handle referral code processing if passed and user doesn't have a referrer
    if (refCode && typeof refCode === 'string' && !(user as any).referredBy && (user as any).referralCode !== refCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: refCode } as any });
      if (referrer) {
        // Give referrer XP and count, and set referredBy for new user
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { referredBy: refCode } as any
          }),
          prisma.user.update({
            where: { id: referrer.id },
            data: { referralCount: { increment: 1 }, diveDepth: { increment: 100 } } as any
          })
        ]);
        user = { ...user, referredBy: refCode } as any;
      }
    }

    return user;
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) return user;
    }
    throw e;
  }
}
