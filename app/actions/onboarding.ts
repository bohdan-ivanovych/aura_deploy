'use server';

import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/app/actions/user';
import { trackServer } from '@/lib/services/analytics.server';

export async function completeOnboarding(name: string, nativeLanguage: string) {
  const user = await getCurrentUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name.trim().slice(0, 50) || 'User',
      nativeLanguage: nativeLanguage || 'uk',
    },
  });

  await trackServer(user.id, 'onboarding_completed', { nativeLanguage });
}
