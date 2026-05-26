'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useTabContext, type TabRoute } from '@/lib/contexts/tab-context';
import dynamic from 'next/dynamic';

const HomeTab       = dynamic(() => import('@/components/dashboard/DashboardClient').then(mod => mod.DashboardClient), { ssr: false });
const ChatTab       = dynamic(() => import('@/components/chat/ChatClient'),  { ssr: false });
const FlashcardsTab = dynamic(() => import('@/app/flashcards/FlashcardsDashboardClient'), { ssr: false });
const StatsTab      = dynamic(() => import('@/app/stats/page'),              { ssr: false });

const TAB_ORDER: TabRoute[] = ['/', '/chat', '/flashcards', '/stats'];

interface TabShellProps {
  children: ReactNode;
  isTabRoute: boolean;
}

export function TabShell({ children, isTabRoute }: TabShellProps) {
  const { activeTab } = useTabContext();
  const [mounted, setMounted] = useState(false);
  // Lazily track visited tabs — only mount a tab when it's first activated
  const [visited, setVisited] = useState<Set<TabRoute>>(() => new Set([activeTab] as TabRoute[]));

  useEffect(() => { setMounted(true); }, []);

  // Mark tab as visited when it becomes active
  useEffect(() => {
    if (!mounted) return;
    setVisited(prev => {
      if (prev.has(activeTab)) return prev;
      return new Set([...prev, activeTab]);
    });
  }, [activeTab, mounted]);

  if (!isTabRoute || !mounted) return <>{children}</>;

  return (
    <>
      {TAB_ORDER.map(tab => {
        if (!visited.has(tab)) return null;
        const isActive = tab === activeTab;
        return (
          <div
            key={tab}
            style={{
              display: isActive ? 'flex' : 'none',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              // CSS containment on hidden tabs prevents layout thrashing
              contain: isActive ? 'none' : 'strict',
            }}
          >
            {tab === '/'           && <HomeTab />}
            {tab === '/chat'       && <ChatTab initialSessions={[]} />}
            {tab === '/flashcards' && <FlashcardsTab />}
            {tab === '/stats'      && <StatsTab />}
          </div>
        );
      })}
    </>
  );
}
