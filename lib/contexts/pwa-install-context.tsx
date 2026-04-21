'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PWAInstallContextType {
  deferred: BeforeInstallPromptEvent | null;
  install: () => Promise<void>;
  installModalOpen: boolean;
  setInstallModalOpen: (open: boolean) => void;
  isIOS: boolean;
  isStandalone: boolean;
  notifPermission: NotificationPermission | null;
  requestNotifications: () => Promise<void>;
  isMobile: boolean;
  /** Call this after a user engagement event — shows prompt if metrics qualify */
  triggerInstallIfEligible: () => void;
  /** Snooze for 1 day without marking as fully dismissed */
  remindLater: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined);

const DISMISSED_KEY = 'aura.pwa.dismissed';
const REMIND_KEY = 'aura.pwa.remind_later';
const DISMISSED_TTL = 1000 * 60 * 60 * 24 * 7;  // 7 days after explicit dismiss
const REMIND_TTL    = 1000 * 60 * 60 * 24 * 1;  // 1 day after "remind me later"

function wasDismissedRecently(): boolean {
  try {
    const ds = localStorage.getItem(DISMISSED_KEY);
    if (ds && Date.now() - Number(ds) < DISMISSED_TTL) return true;
    const rs = localStorage.getItem(REMIND_KEY);
    if (rs && Date.now() - Number(rs) < REMIND_TTL) return true;
    return false;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch { }
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installModalOpen, setInstallModalOpenRaw] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const autoTriggered = useRef(false);

  const setInstallModalOpen = useCallback((open: boolean) => {
    if (!open) markDismissed();
    setInstallModalOpenRaw(open);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    const mobile = ios || android || window.innerWidth < 768;
    setIsIOS(ios);
    setIsMobile(mobile);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Metric-based trigger — no timers.
  // ChatClient or any page calls triggerInstallIfEligible() after engagement.
  // We check metrics stored in localStorage:
  //   aura.metrics.msgs  — total USER messages sent (integer)
  //   aura.metrics.profile — '1' if user visited profile page
  const triggerInstallIfEligible = useCallback(() => {
    if (autoTriggered.current) return;
    if (isStandalone) return;
    if (!isMobile) return;
    if (wasDismissedRecently()) return;
    if (!deferred && !isIOS) return;

    try {
      const msgs = parseInt(localStorage.getItem('aura.metrics.msgs') || '0', 10);
      const visitedProfile = localStorage.getItem('aura.metrics.profile') === '1';
      // Trigger if: (≥5 msgs AND visited profile) OR ≥15 msgs regardless
      const qualified = (msgs >= 5 && visitedProfile) || msgs >= 15;
      if (!qualified) return;
    } catch {
      return;
    }

    autoTriggered.current = true;
    setInstallModalOpenRaw(true);
  }, [isStandalone, isMobile, deferred, isIOS]);

  const remindLater = useCallback(() => {
    try { localStorage.setItem(REMIND_KEY, String(Date.now())); } catch {}
    setInstallModalOpenRaw(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'dismissed') {
      markDismissed();
    }
    setInstallModalOpenRaw(false);
  }, [deferred]);

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }, []);

  return (
    <PWAInstallContext.Provider
      value={{
        deferred,
        install,
        installModalOpen,
        setInstallModalOpen,
        isIOS,
        isStandalone,
        notifPermission,
        requestNotifications,
        isMobile,
        triggerInstallIfEligible,
        remindLater,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  const context = useContext(PWAInstallContext);
  if (context === undefined) {
    throw new Error('usePWAInstall must be used within a PWAInstallProvider');
  }
  return context;
}
