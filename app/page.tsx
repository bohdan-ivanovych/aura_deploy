import { Suspense } from 'react';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { getChatSessions } from '@/lib/data/chat';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import Loading from './loading';

async function DashboardDataWrapper({ refCode }: { refCode?: string }) {
  let user;
  try {
    user = await getOrCreateUser(refCode);
  } catch (error) {
    throw error;
  }

  // Fetch initial data for the dashboard in parallel to prevent client-side waterfalls
  const [sessions, sent, received] = await Promise.all([
    getChatSessions().catch(() => []),
    prisma.friendship.findMany({
      where: { senderId: user.id },
      include: { receiver: { select: { id: true, name: true, email: true, xp: true, streak: true, diveDepth: true, lastActiveAt: true } } },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => []),
    prisma.friendship.findMany({
      where: { receiverId: user.id },
      include: { sender: { select: { id: true, name: true, email: true, xp: true, streak: true, diveDepth: true, lastActiveAt: true } } },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => []),
  ]);

  // Transform friendships
  const accepted = [
    ...(sent ?? []).filter(f => f.status === 'ACCEPTED').map(f => f.receiver!),
    ...(received ?? []).filter(f => f.status === 'ACCEPTED').map(f => f.sender!),
  ];
  
  const incoming = (received ?? []).filter(f => f.status === 'PENDING').length;

  return (
    <DashboardClient 
      initialSessions={Array.isArray(sessions) ? sessions.slice(0, 3) : []} 
      initialFriends={accepted} 
      initialPendingIn={incoming} 
    />
  );
}

export default async function Page(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const refCode = typeof searchParams.ref === 'string' ? searchParams.ref : undefined;
  
  return (
    <Suspense fallback={<Loading />}>
      <DashboardDataWrapper refCode={refCode} />
    </Suspense>
  );
}
