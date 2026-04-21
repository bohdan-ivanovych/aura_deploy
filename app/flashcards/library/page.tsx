import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getOrCreateUser();
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';

  // Fetch Public Decks
  const publicDecks = await prisma.deck.findMany({
    where: {
      isPublic: true,
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      } : {}),
    },
    include: {
      _count: { select: { cards: true } },
      likes: { where: { userId: user.id } }, // to see if current user liked it
      user: { select: { name: true } }
    },
    orderBy: { likesCount: 'desc' },
    take: 20,
  });

  return <LibraryClient userId={user.id} publicDecks={publicDecks} initialQuery={q} />;
}
