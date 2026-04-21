'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export const TAB_ROUTES = ['/', '/chat', '/flashcards', '/stats'] as const;
export type TabRoute = typeof TAB_ROUTES[number];

interface TabContextValue {
  activeTab: TabRoute;
  setActiveTab: (tab: TabRoute) => void;
  prevTab: TabRoute | null;
}

const TabContext = createContext<TabContextValue>({
  activeTab: '/',
  setActiveTab: () => { },
  prevTab: null,
});

export function TabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const initialTab: TabRoute = (TAB_ROUTES as readonly string[]).includes(pathname)
    ? (pathname as TabRoute)
    : '/';

  const [activeTab, setActiveTabState] = useState<TabRoute>(initialTab);
  const [prevTab, setPrevTab] = useState<TabRoute | null>(null);

  const setActiveTab = useCallback((tab: TabRoute) => {
    setPrevTab(prev => prev !== tab ? activeTab : prev);
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', tab);
    }
  }, [activeTab]);

  // Sync tab state with actual pathname (fixes direct navigation via URL or sidebar)
  useEffect(() => {
    if ((TAB_ROUTES as readonly string[]).includes(pathname as TabRoute)) {
      const pathTab = pathname as TabRoute;
      setActiveTabState(prev => {
        if (prev !== pathTab) return pathTab;
        return prev;
      });
    }
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname as TabRoute;
      if ((TAB_ROUTES as readonly string[]).includes(path)) {
        setActiveTabState(path);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, prevTab }}>
      {children}
    </TabContext.Provider>
  );
}

export const useTabContext = () => useContext(TabContext);
