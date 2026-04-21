'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStats } from '@/lib/contexts/stats-context';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

interface OnboardingGateProps {
  children: React.ReactNode;
}

function getLocalDone(): boolean {
  try { return localStorage.getItem('aura_onboarding_done') === 'true'; } catch { return false; }
}

import { LoadingScreen } from '@/components/ui/LoadingScreen';

function GateSkeleton() {
  return <LoadingScreen />;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { stats, loading } = useStats();
  const { hasCompletedOnboarding, setCompleted, setLoading } = useOnboardingStore();
  const hasRedirectedRef = useRef(false);

  // Track whether we've resolved the gate (can show children)
  const [gateResolved, setGateResolved] = useState(false);

  // Immediate check — runs once on mount
  useEffect(() => {
    if (pathname === '/onboarding') {
      setGateResolved(true);
      return;
    }

    const localDone = getLocalDone();
    if (hasCompletedOnboarding || localDone) {
      setCompleted(true);
      setLoading(false);
      setGateResolved(true);
      return;
    }

    // Not done → redirect immediately, DON'T resolve gate (keep skeleton)
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      try { localStorage.removeItem('aura_onboarding_done'); } catch {}
      setCompleted(false);
      setLoading(false);
      router.replace('/onboarding');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Secondary check after stats load — confirm with server state
  useEffect(() => {
    if (loading) return;
    if (pathname === '/onboarding') {
      setGateResolved(true);
      return;
    }

    const localDone = getLocalDone();
    if (hasCompletedOnboarding || localDone) {
      setCompleted(true);
      setLoading(false);
      setGateResolved(true);
      return;
    }

    if (stats) {
      const serverDone = stats.name !== null && stats.name !== 'Anonymous' && stats.name !== '';

      if (!serverDone) {
        if (hasRedirectedRef.current) return;
        hasRedirectedRef.current = true;
        try { localStorage.removeItem('aura_onboarding_done'); } catch {}
        setCompleted(false);
        setLoading(false);
        router.replace('/onboarding');
        return;
      }

      try { localStorage.setItem('aura_onboarding_done', 'true'); } catch {}
      setCompleted(true);
      setLoading(false);
      setGateResolved(true);
    }
  }, [loading, stats, hasCompletedOnboarding, setCompleted, setLoading, router, pathname]);

  // While gate is unresolved, show skeleton instead of children
  // This prevents the flash of main app (sidebar, bottom nav, etc.)
  if (!gateResolved) {
    return <GateSkeleton />;
  }

  return <>{children}</>;
}
