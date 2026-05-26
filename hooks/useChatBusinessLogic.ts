import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStats } from '@/lib/contexts/stats-context';
import { useHydratedStore } from '@/lib/stores/store';
import { usePWAInstall } from '@/lib/contexts/pwa-install-context';
import { useChatUIStore } from '@/lib/stores/ui-store';
import { startInactivityNotifications, stopInactivityNotifications } from '@/lib/notifications';
import { haptics } from '@/lib/utils/haptics';
import { toast } from 'sonner';

export function useChatBusinessLogic({
  initialSessions,
  sessions,
  setSessions,
  selectedSessionId,
  setChatSessionsLoading,
}: {
  initialSessions: any[];
  sessions: any[];
  setSessions: (val: any) => void;
  selectedSessionId: string | null;
  setChatSessionsLoading: (val: boolean) => void;
}) {
  const hydrated = useHydratedStore();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const pickerParam = searchParams.get('picker') === 'true';
  const pickerTriggeredRef = useRef(false);
  const onboardingGreetedRef = useRef(false);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const { triggerInstallIfEligible } = usePWAInstall();
  const {
    setStudioOpen,
    setShowRegisterPrompt,
    showRegisterPrompt,
    setShowPushPrompt,
    toggleReelMode,
  } = useChatUIStore();

  const selectedSession = useMemo(
    () => (Array.isArray(sessions) ? sessions : []).find(s => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );
  
  const currentMessages = selectedSession?.messages || [];
  
  const userMessageCount = useMemo(
    () => currentMessages.filter((m: any) => m.sender === 'USER').length,
    [currentMessages]
  );
  
  const aiMessageCount = useMemo(
    () => currentMessages.filter((m: any) => m.sender === 'AI').length,
    [currentMessages]
  );

  // Inactivity Notifications
  useEffect(() => {
    if (!selectedSessionId) { stopInactivityNotifications(); return; }
    const session = sessions.find(s => s.id === selectedSessionId);
    if (session) startInactivityNotifications(session.persona.name);
    return () => stopInactivityNotifications();
  }, [selectedSessionId, sessions]);

  // Eagerly load full messages when a session is selected
  const fetchedSessionsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!selectedSessionId || !selectedSession) return;
    
    // Always asynchronously load full message history (up to 50) when opening a chat for the first time, 
    // but don't block the UI if we already have the initial 15 messages.
    if (!fetchedSessionsRef.current.has(selectedSessionId)) {
      fetchedSessionsRef.current.add(selectedSessionId);
      
      const loadMessages = async () => {
        // Only show blocking loading state if we have 0 messages
        if ((selectedSession.messages?.length || 0) === 0) {
          setIsLoadingMessages(true);
        }
        try {
          const res = await fetch(`/api/chat-sessions/${selectedSessionId}/messages`);
          if (!res.ok) throw new Error('Failed to fetch messages');
          const data = await res.json();
          if (data.messages) {
            import('@/lib/stores/store').then(({ useAppStore }) => {
              const currentSessions = useAppStore.getState().chatSessions;
              setSessions(currentSessions.map((s: any) => 
                s.id === selectedSessionId ? { ...s, messages: data.messages } : s
              ));
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingMessages(false);
        }
      };
      void loadMessages();
    }
  }, [selectedSessionId, selectedSession, setSessions]);

  // Sync initial sessions from server props (if any) and background fetch latest
  useEffect(() => {
    if (!hydrated) return;
    
    // Set loading false immediately if we have any cached or initial sessions
    if (initialSessions.length > 0 || sessions.length > 0) {
      setChatSessionsLoading(false);
    }

    const syncSessions = async () => {
      try {
        let loaded = initialSessions;
        // Only fetch if we truly have no sessions at all (not even cached)
        if (loaded.length === 0 && sessions.length === 0) {
          const res = await fetch('/api/chat-sessions');
          if (res.ok) {
            const data = await res.json();
            loaded = data.sessions || [];
          }
        } else if (loaded.length === 0) {
          // We have cached sessions, no need to block on fetch
          setChatSessionsLoading(false);
          return;
        }
        
        if (loaded.length > 0) {
          import('@/lib/stores/store').then(({ useAppStore }) => {
            const currentSessions = useAppStore.getState().chatSessions;
            const merged = loaded.map(newSession => {
              const existing = currentSessions.find((s: any) => s.id === newSession.id);
              // Preserve expanded message history if we already fetched it
              if (existing && existing.messages?.length > newSession.messages?.length) {
                return { ...newSession, messages: existing.messages };
              }
              return newSession;
            });
            setSessions(merged);
          });
        } else if (sessions.length === 0 && !pickerParam) {
          setStudioOpen(true);
        }
      } catch {
        console.error('Failed to sync sessions');
      } finally {
        setChatSessionsLoading(false);
      }
    };

    void syncSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Open Persona Studio on ?picker=true
  useEffect(() => {
    if (pickerParam && hydrated && !pickerTriggeredRef.current) {
      pickerTriggeredRef.current = true;
      setTimeout(() => setStudioOpen(true), 300);
    }
  }, [pickerParam, hydrated, setStudioOpen]);

  // Handle post-upgrade celebration
  useEffect(() => {
    let isMounted = true;
    if (searchParams.get('upgraded') !== 'true') return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('upgraded');
      window.history.replaceState({}, '', url.toString());
    }
    import('canvas-confetti').then((confetti) => {
      if (!isMounted) return;
      confetti.default({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ['#00d4d4', '#7c3aed', '#22c55e', '#f59e0b'] });
    }).catch(() => { });
    toast('🎉 Welcome to Aura Pro!', {
      description: 'Unlimited messages, priority AI, and all future Pro features are now unlocked.',
      duration: 8000,
    });
    return () => { isMounted = false; };
  }, [searchParams]);

  // Onboarding: inject AI greeting
  useEffect(() => {
    if (!isOnboarding || onboardingGreetedRef.current || !selectedSession) return;
    if (selectedSession.messages.length > 0) { onboardingGreetedRef.current = true; return; }
    
    // We intentionally access localStorage safely outside of React execution context warnings
    try {
      const storedName = typeof window !== 'undefined' ? (localStorage.getItem('onboardingName') ?? '') : '';
      const firstName = storedName.split(' ')[0] || '';
      const nameGreeting = firstName ? `, ${firstName}` : '';
      const greetings = [
        `Hey${nameGreeting}! What's something you've been thinking about a lot lately?`,
        `Hey${nameGreeting}! So where are you from? I've always been curious about people from different places.`,
        `Hey${nameGreeting}! What's the most interesting thing you've learned recently?`,
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      if (storedName) localStorage.removeItem('onboardingName');
      onboardingGreetedRef.current = true;
      
      const updatedSessions = sessions.map((s: any) =>
        s.id === selectedSession.id
          ? { ...s, messages: [{ id: `greeting-${Date.now()}`, text: greeting, sender: 'AI', createdAt: new Date(), grammarCorrection: null, weaknessIdentified: null, xpReward: 0, _showWordHint: true }] }
          : s
      );
      setSessions(updatedSessions as any);
    } catch {}
  }, [isOnboarding, selectedSession, sessions, setSessions]);

  // Push prompt after 5 msgs
  useEffect(() => {
    if (userMessageCount < 5 || typeof window === 'undefined') return;
    if (localStorage.getItem('push_prompt_shown')) return;
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const timer = setTimeout(() => setShowPushPrompt(true), 1500);
    return () => clearTimeout(timer);
  }, [userMessageCount, setShowPushPrompt]);

  // PWA install metrics
  useEffect(() => {
    if (userMessageCount < 1 || typeof window === 'undefined') return;
    try {
      const prev = parseInt(localStorage.getItem('aura.metrics.msgs') || '0', 10);
      const next = Math.max(prev, userMessageCount);
      localStorage.setItem('aura.metrics.msgs', String(next));
    } catch { }
    if (userMessageCount === 5 || userMessageCount === 15) {
      triggerInstallIfEligible();
    }
  }, [userMessageCount, triggerInstallIfEligible]);

  // Reel feature discovery prompt
  useEffect(() => {
    if (aiMessageCount < 10 || !selectedSessionId || typeof window === 'undefined') return;
    const sessionKey = `reel_prompt_${selectedSessionId}`;
    if (localStorage.getItem(sessionKey)) return;
    localStorage.setItem(sessionKey, '1');
    const timer = setTimeout(() => {
      toast('🎬 Your session is reel-worthy!', {
        description: 'Create a Study Reel to share your English journey.',
        duration: 8000,
        action: {
          label: 'Create Reel',
          onClick: () => {
            haptics.medium();
            toggleReelMode();
          },
        },
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [aiMessageCount, selectedSessionId, toggleReelMode]);

  return {
    selectedSession,
    currentMessages,
    isOnboarding,
    isLoadingMessages
  };
}

