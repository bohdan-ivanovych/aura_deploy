'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { TabShell } from './TabShell';

const TAB_ROUTES = ['/', '/chat', '/flashcards', '/stats'];

export function TabShellWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isTabRoute = TAB_ROUTES.includes(pathname);
  return <TabShell isTabRoute={isTabRoute}>{children}</TabShell>;
}
