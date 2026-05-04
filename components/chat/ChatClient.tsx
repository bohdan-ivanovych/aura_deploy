'use client';

import { useChatUIStore } from '@/lib/stores/ui-store';
import { MessageList } from '@/components/chat/MessageList';
import { ChatMessage, ReplyTarget } from '@/components/chat/ChatMessage';
import { ChatSkeleton, ChatListSkeleton } from '@/components/chat/ChatSkeleton';
import { ChatInput } from '@/components/chat/ChatInput';
import { XPIndicator } from '@/components/chat/XPIndicator';

import { ChatErrorBoundary } from '@/components/chat/ChatErrorBoundary';
import { ShareAction } from '@/components/chat/ShareAction';
import { EmptyChatState } from '@/components/chat/EmptyChatState';
import { MobileChatList } from '@/components/chat/MobileChatList';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useChatBusinessLogic } from '@/hooks/useChatBusinessLogic';
import dynamic from 'next/dynamic';

const PersonaStudio = dynamic(
  () => import('@/components/chat/PersonaStudio').then(m => ({ default: m.PersonaStudio })),
  { ssr: false }
);
const LevelUpModal = dynamic(
  () => import('@/components/ui/LevelUpModal').then(m => ({ default: m.LevelUpModal })),
  { ssr: false }
);
const PushPrompt = dynamic(
  () => import('@/components/chat/PushPrompt').then(m => ({ default: m.PushPrompt })),
  { ssr: false }
);
const CallScreen = dynamic(
  () => import('@/components/chat/CallScreen').then(m => ({ default: m.CallScreen })),
  { ssr: false }
);
const RegisterPrompt = dynamic(
  () => import('@/components/chat/RegisterPrompt').then(m => ({ default: m.RegisterPrompt })),
  { ssr: false }
);
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Plus, X, MoreVertical,
  ChevronLeft, Zap, Phone, Bot, Eye
} from 'lucide-react';
import Link from 'next/link';

import { useHydratedStore } from '@/lib/stores/store';
import { useStats } from '@/lib/contexts/stats-context';
import { haptics } from '@/lib/utils/haptics';

import { DailyBounties } from '@/components/chat/DailyBounties';
import { startInactivityNotifications, stopInactivityNotifications } from '@/lib/notifications';
import { useChatHandlers } from '@/hooks/useChatHandlers';
import { usePWAInstall } from '@/lib/contexts/pwa-install-context';
import { toast } from 'sonner';

type Persona = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  voiceId?: string | null;
  voiceSettings?: { us?: string | null; gb?: string | null } | null;
};

type Message = {
  id?: string;
  text: string;
  sender: 'USER' | 'AI' | 'USER_A' | 'USER_B';
  grammarCorrection?: string | null;
  weaknessIdentified?: string | null;
  xpReward?: number;
  suggestion?: string | null;
  createdAt?: Date | string | null;
  edited?: boolean;
  originalText?: string | null;
  blockedBy?: string | null;
  replyToId?: string | null;
  errorSpan?: { original: string; corrected: string } | null;
  reaction?: string | null;
  senderPersonaId?: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  readState?: 'sent' | 'received' | 'read';
  isSystemDivider?: boolean;
  systemDividerText?: string;
};

type ChatSession = {
  id: string;
  persona: Persona;
  messages: Message[];
  blockedBy?: string | null;
  blockedAt?: Date | string | null;
  unreadCount?: number;
};

interface ChatClientProps {
  initialSessions?: ChatSession[];
}

// WordHintBadge moved to MessageList.tsx



export default function ChatClient({ initialSessions = [] }: ChatClientProps) {
  const hydrated = useHydratedStore();
  const { stats, leveledUp, clearLevelUp } = useStats();
  const {
    loading, isCreating, lastDepthChange, replyTo, setReplyTo,
    practicePrompt, setPracticePrompt, isMountedRef, limitReached, setLimitReached,
    typingSessionId, handleReaction,
    handleSelectSession, handleDeleteSession, handleEditMessage, handleDeleteMessage,
    handleBlockAI, handleUnblockAI, handleClearMemory, handleWipePersonaMemory, handleInitializeSession, handleSendMessage,
    sessions, setSessions, selectedSessionId, setSelectedSessionId, addSession,
  } = useChatHandlers();

  // Track whether we're doing the initial sessions HTTP fetch
  const [chatSessionsLoading, setChatSessionsLoading] = useState(true);

  const searchParams = useSearchParams();
  const [showOnboardingHint, setShowOnboardingHint] = useState(searchParams.get('onboarding') === 'true');

  const {
    isStudioOpen, setStudioOpen: setIsStudioOpen,
    mobileMenuOpen, setMobileMenuOpen,
    editingMessageId, setEditingMessageId,
    reelMode, setReelMode, toggleReelMode,
    selectedMsgIds, toggleReelSelection: handleReelToggle, clearReelSelection,
    showReelModal, setShowReelModal,
    showPushPrompt, setShowPushPrompt,
    showRegisterPrompt, setShowRegisterPrompt,
    callOpen, setCallOpen,
    shareTrigger, setShareTrigger,
  } = useChatUIStore();

  const [targetAccent, setTargetAccent] = useState<'us' | 'gb'>('us');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [hasReadCorrection, setHasReadCorrection] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const { triggerInstallIfEligible } = usePWAInstall();

  // Task 10: promotional period — suppress all limit UI client-side
  const isUnlimitedPeriod = new Date() < new Date('2026-06-01T00:00:00Z');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const accent = data?.user?.targetAccent;
        if (accent === 'us' || accent === 'gb') setTargetAccent(accent);
        if (data?.user?.referralCode) setReferralCode(data.user.referralCode);
        const hasName = !!(data?.user?.name || data?.user?.username);
        setIsAuthenticated(hasName);
      })
      .catch(() => { });
  }, []);

  const {
    selectedSession,
    currentMessages,
    isOnboarding,
    isLoadingMessages
  } = useChatBusinessLogic({
    initialSessions,
    sessions,
    setSessions,
    selectedSessionId,
    setChatSessionsLoading
  });

  const [headerCompressed, setHeaderCompressed] = useState(false);


  const reelMessages = useMemo(
    () => currentMessages
      .filter((m: any) => m.id && selectedMsgIds.has(m.id))
      .map((m: any) => ({
        id: m.id!,
        text: m.text,
        sender: (m.sender === 'USER' ? 'USER' : 'AI') as 'USER' | 'AI',
        weaknessIdentified: m.weaknessIdentified ?? null,
      })),
    [currentMessages, selectedMsgIds]
  );

  const reelSelectionOrder = useMemo(() => {
    const order: Record<string, number> = {};
    let idx = 1;
    for (const m of currentMessages) {
      if (m.id && selectedMsgIds.has(m.id)) {
        order[m.id] = idx++;
      }
    }
    return order;
  }, [currentMessages, selectedMsgIds]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, [isMountedRef]);

  useEffect(() => {
    if (searchParams.get('picker') === 'true') {
      setIsStudioOpen(true);
    }
  }, [searchParams, setIsStudioOpen]);



  const handlePushPromptDismiss = useCallback(() => {
    setShowPushPrompt(false);
    localStorage.setItem('push_prompt_shown', '1');
  }, []);

  const handleWordPopupRead = useCallback(() => {
    // Deliberately empty: removed spammy prompt trigger on pedagogical review
  }, []);

  const handleRegisterPromptDismiss = useCallback(() => {
    setShowRegisterPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('register_prompt_dismissed', '1');
    }
  }, []);

  const handleCallEnd = useCallback((exchanges: Array<{ userText: string; aiText: string; audioDuration: number }>) => {
    if (!selectedSessionId) return;
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    if (!currentSession) return;

    const now = new Date();
    // Calculate total call duration from exchanges (approx 30s per exchange)
    const totalSecs = exchanges.length * 30;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // ONE system divider only — like Telegram. No voice bubbles rendered.
    // The transcripts are already saved server-side as isHiddenFromChat: true.
    const divider = {
      id: `call-divider-${Date.now()}`,
      text: `📞 Call ended · ${durationStr}`,
      sender: 'AI' as const,
      isSystemDivider: true,
      systemDividerText: `📞 Call ended · ${durationStr}`,
      createdAt: now,
    };

    const preMessages = currentSession.messages as any[];
    setSessions(sessions.map(s =>
      s.id === selectedSessionId
        ? { ...s, messages: [...preMessages, divider] }
        : s
    ));
  }, [selectedSessionId, sessions, setSessions]);

  const handleReply = useCallback((target: ReplyTarget) => setReplyTo(target), [setReplyTo]);



  const handleCancelReply = useCallback(() => setReplyTo(null), [setReplyTo]);
  const handleExplainMsg = useCallback(async (text: string) => {
    if (!selectedSessionId || loading) return;
    await handleSendMessage(`Please explain the grammar in this sentence: "${text}"`, selectedSessionId);
  }, [selectedSessionId, loading, handleSendMessage]);

  const getReplyToMsg = (msg: Message) => {
    if (!msg.replyToId) return null;
    const found = currentMessages.find((m: any) => m.id === msg.replyToId);
    if (!found) return null;
    return { id: found.id!, text: found.text, sender: found.sender === 'USER' ? 'USER' as const : 'AI' as const };
  };

  const sendHandler = useCallback((text: string, _replyToId?: string, shortVideoPlatform?: 'tiktok' | 'shorts' | 'reels' | false) => {
    if (!selectedSessionId) return;
    if (shortVideoPlatform) {
      setIsWatching(true);
      // Auto-clear once loading finishes (safety net: 15s max)
      setTimeout(() => setIsWatching(false), 15000);
    }
    handleSendMessage(text, selectedSessionId, replyTo, shortVideoPlatform === 'tiktok', !!shortVideoPlatform, shortVideoPlatform || undefined).finally(() => {
      setIsWatching(false);
    });
  }, [selectedSessionId, replyTo, handleSendMessage]);

  const multiPersona = useMemo(() => {
    const personaIds = new Set(
      (currentMessages as any[])
        .filter((m: any) => m.sender === 'AI' && m.senderPersonaId)
        .map((m: any) => m.senderPersonaId)
    );
    return personaIds.size > 1;
  }, [currentMessages]);

  return (
    <ChatErrorBoundary>
      <div className="h-[100dvh] bg-[var(--background)] relative overflow-hidden flex flex-col">
        <AnimatePresence>
          {leveledUp && (
            <LevelUpModal newLevel={leveledUp.newLevel} newDepth={leveledUp.newDepth} onClose={clearLevelUp} />
          )}
        </AnimatePresence>

        <RegisterPrompt open={showRegisterPrompt} onDismiss={handleRegisterPromptDismiss} />

        <AnimatePresence>
          {callOpen && selectedSession && (
            <CallScreen
              isOpen={callOpen}
              onClose={() => setCallOpen(false)}
              sessionId={selectedSession.id}
              personaId={selectedSession.persona.id}
              personaName={selectedSession.persona.name}
              onCallEnd={handleCallEnd}
              currentDepth={stats?.diveDepth ?? 0}
            />
          )}
        </AnimatePresence>

        <PersonaStudio
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          onInitialize={(pid) => handleInitializeSession(pid, () => setIsStudioOpen(false))}
        />

        {/* ── Mobile ── */}
        <div className="md:hidden h-full flex flex-col min-h-0">
          {/* Auto-select first session when loading is done */}
          {chatSessionsLoading ? (
            // Show skeleton while sessions load the very first time
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <div className="w-14 h-14 rounded-2xl skeleton" />
              <div className="space-y-2 w-full max-w-[220px]">
                <div className="skeleton h-3 rounded-full w-full" />
                <div className="skeleton h-2.5 rounded-full w-3/4 mx-auto" />
              </div>
            </div>
          ) : !selectedSession ? (
            sessions.length === 0 ? (
              // No session at all → open PersonaStudio
              <EmptyChatState onStart={() => setIsStudioOpen(true)} />
            ) : (
              // Mobile Chat List
              <MobileChatList 
                sessions={sessions}
                onSelectSession={handleSelectSession}
                onOpenStudio={() => setIsStudioOpen(true)}
              />
            )
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <header className="shrink-0 z-20 border-b border-[var(--border)] flex items-center px-4 transition-all duration-150"
                style={{ background: 'var(--chat-header-bg)', backdropFilter: 'blur(20px)', minHeight: headerCompressed ? '3.5rem' : '4.5rem', paddingTop: 'env(safe-area-inset-top, 8px)', paddingBottom: headerCompressed ? '4px' : '8px' }}>
                <button onClick={() => setSelectedSessionId(null)}
                  className="mr-2 tap-target rounded-xl hover:bg-[var(--surface-hover)] transition-colors">
                  <ChevronLeft className="w-5 h-5 text-[var(--foreground)]" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center">
                    {selectedSession.persona.avatarUrl
                      ? <img src={selectedSession.persona.avatarUrl} className="w-full h-full object-cover" alt={selectedSession.persona.name} />
                      : <span className="text-xs font-bold text-[var(--foreground-muted)]">{selectedSession.persona.name?.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-black text-[var(--foreground)] truncate">{selectedSession.persona.name}</h2>
                    {selectedSession.blockedBy ? (
                      <p className="text-[8px] text-red-400 uppercase font-bold tracking-wide">
                        {selectedSession.blockedBy === 'USER' ? 'Blocked by you' : 'Blocked by AI'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-1">
                        {isWatching ? (
                          <>
                            <div className="flex gap-1 items-center">
                              <Eye className="w-3 h-3 text-blue-400 animate-pulse" />
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] relative top-px" style={{ color: 'rgba(96,165,250,0.9)' }}>
                              Watching...
                            </p>
                          </>
                        ) : (loading || typingSessionId === selectedSession.id) ? (
                          <>
                            <div className="flex gap-1 items-center">
                              <motion.div animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-80" />
                              <motion.div animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-80" />
                              <motion.div animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-80" />
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] relative top-px" style={{ color: 'rgba(74,222,128,0.7)' }}>
                              Writing...
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] relative top-px" style={{ color: 'rgba(74,222,128,0.7)' }}>
                              Online
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">

                  <button
                    onClick={() => { haptics.light(); setCallOpen(true); }}
                    className="tap-target rounded-xl transition-colors hover:bg-[var(--surface-hover)]"
                    title="Start Call"
                  >
                    <Phone className="w-5 h-5" style={{ color: 'var(--foreground-muted)' }} />
                  </button>
                  <div className="relative">
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="tap-target rounded-xl transition-colors"
                      style={{ background: 'var(--surface)', borderRadius: '10px' }}>
                      <MoreVertical className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                    </button>
                    <AnimatePresence>
                      {mobileMenuOpen && (
                        <>
                          <motion.div className="fixed inset-0 z-[82]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)} />
                          <motion.div initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className="absolute right-0 pr-[env(safe-area-inset-right)] top-full mt-2 z-[83] min-w-[180px] rounded-2xl overflow-hidden py-1.5 shadow-2xl"
                            style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                            <button onClick={() => {
                              if (window.confirm('Are you sure you want to delete this chat and wipe the memory? This cannot be undone.')) {
                                handleWipePersonaMemory(selectedSession.persona.id, selectedSession.id);
                                handleDeleteSession(selectedSession.id);
                                setMobileMenuOpen(false);
                              }
                            }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-500/10 transition-colors">
                              <X className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="text-[12px] font-semibold text-red-400">Delete Chat</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </header>

              <div className="absolute right-6 z-30" style={{ top: headerCompressed ? '68px' : '84px', transition: 'top 0.15s ease-out' }}>
                <DailyBounties isCompactView={true} />
              </div>

              <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
                {isLoadingMessages ? (
                  <div className="flex-1 flex flex-col items-center justify-center pointer-events-none opacity-50 relative z-10 w-full h-full pb-8">
                     <span className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent-cyan)] animate-spin" />
                  </div>
                ) : (
                  <MessageList
                    messages={currentMessages as any}
                    selectedSession={selectedSession}
                    selectedSessionId={selectedSessionId}
                    loading={loading}
                    typingSessionId={typingSessionId}
                    multiPersona={multiPersona}
                    targetAccent={targetAccent}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onExplainMsg={handleExplainMsg}
                    onReply={handleReply}
                    onReelToggle={(id) => handleReelToggle(id, 18)}
                    onWordPopupRead={handleWordPopupRead}
                    onReaction={(msgId, emoji) => { if (emoji) handleReaction(msgId, emoji); }}
                    reelMode={reelMode}
                    selectedMsgIds={selectedMsgIds}
                    editingMessageId={editingMessageId}
                    reelSelectionOrder={reelSelectionOrder}
                    onScroll={(y) => {
                      if (y > 100) setHeaderCompressed(true);
                      else if (y < 40) setHeaderCompressed(false);
                    }}
                  />
                )}
              </div>



              <AnimatePresence>
                {limitReached && !isUnlimitedPeriod && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  >
                    <div className="w-full max-w-sm rounded-[24px] p-6 flex flex-col items-center text-center gap-4"
                      style={{ background: 'rgba(15,20,30,0.95)', border: '1px solid rgba(0,212,212,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,212,212,0.15)' }}>
                        <Zap className="w-7 h-7" style={{ color: 'var(--accent-cyan)' }} />
                      </div>
                      <div>
                        <p className="text-xl font-black text-white">Daily limit reached</p>
                        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Upgrade for unlimited messages</p>
                      </div>
                      <div className="flex gap-3 w-full mt-2">
                        <button onClick={() => setLimitReached(false)} className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors">
                          Dismiss
                        </button>
                        <Link href="/upgrade" className="flex-1 flex items-center justify-center py-3.5 rounded-xl font-black text-black"
                          style={{ background: 'var(--accent-cyan)' }}>
                          Go Pro
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              <>
                {/* Onboarding hint relocated to MessageList */}
                {showPushPrompt && (
                  <div className="fixed z-50 left-0 right-0 pointer-events-none flex justify-center" style={{ bottom: 'calc(138px + max(16px, env(safe-area-inset-bottom, 16px)))' }}>
                    <div className="pointer-events-auto w-full max-w-lg">
                      <PushPrompt onDismiss={handlePushPromptDismiss} />
                    </div>
                  </div>
                )}
                <ChatInput onSend={sendHandler} disabled={loading}
                  selectedSession={selectedSession} replyTo={replyTo}
                  onCancelReply={handleCancelReply} initialText={practicePrompt} />
              </>
            </div>
          )}

          {shareTrigger && (
            <ShareAction
              forceOpen={true}
              onForceClose={() => setShareTrigger(null)}
              text={shareTrigger.text}
              persona="Aura"
              referralCode={referralCode}
            />
          )}
        </div>

        {/* ── Desktop ── */}
        <div className="hidden md:flex h-full w-full">
          {/* Sidebar */}
          <ChatSidebar
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={handleSelectSession}
            onOpenStudio={() => setIsStudioOpen(true)}
          />

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative" style={{ background: 'var(--chat-area-bg)' }}>
            {selectedSession ? (
              <>
                <header className="h-[60px] flex items-center px-6 shrink-0"
                  style={{ background: 'var(--chat-header-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-black"
                      style={{ background: 'linear-gradient(135deg, rgba(0,212,212,0.25), rgba(0,152,219,0.15))', border: '1px solid rgba(0,212,212,0.2)', color: 'var(--accent-cyan)' }}>
                      {selectedSession.persona.avatarUrl
                        ? <img src={selectedSession.persona.avatarUrl} className="w-full h-full object-cover" alt={selectedSession.persona.name} />
                        : selectedSession.persona.name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div>
                      <h2 className="text-[13px] font-black text-[var(--foreground)] tracking-tight">{selectedSession.persona.name}</h2>
                      {selectedSession.blockedBy ? (
                        <p className="text-[9px] text-red-400 uppercase font-bold tracking-wide">
                          {selectedSession.blockedBy === 'USER' ? 'Blocked by you' : 'Blocked by AI'}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isWatching ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(96,165,250,0.9)' }}>
                                Watching...
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(74,222,128,0.7)' }}>
                                {(loading || typingSessionId === selectedSession.id) ? 'Writing...' : 'Online'}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      handleWipePersonaMemory(selectedSession.persona.id, selectedSession.id);
                      handleDeleteSession(selectedSession.id);
                    }}
                      className="p-2 rounded-xl hover:bg-red-500/15 transition-colors" title="Delete Chat">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </header>

                <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
                  {isLoadingMessages ? (
                    <div className="flex-1 flex flex-col items-center justify-center pointer-events-none opacity-50 relative z-10 w-full h-full pb-8">
                       <span className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent-cyan)] animate-spin" />
                    </div>
                  ) : (
                    <MessageList
                      messages={currentMessages as any}
                      selectedSession={selectedSession}
                      selectedSessionId={selectedSessionId}
                      loading={loading}
                      typingSessionId={typingSessionId}
                      multiPersona={multiPersona}
                      targetAccent={targetAccent}
                      onEditMessage={handleEditMessage}
                      onDeleteMessage={handleDeleteMessage}
                      onExplainMsg={handleExplainMsg}
                      onReply={handleReply}
                      onReelToggle={(id) => handleReelToggle(id, 18)}
                      onWordPopupRead={handleWordPopupRead}
                      onReaction={(msgId, emoji) => { if (emoji) handleReaction(msgId, emoji); }}
                      reelMode={reelMode}
                      selectedMsgIds={selectedMsgIds}
                      editingMessageId={editingMessageId}
                      reelSelectionOrder={reelSelectionOrder}
                      onScroll={(y) => setHeaderCompressed(y > 60)}
                    />
                  )}
                </div>

                <div className="absolute bottom-28 right-8 z-50">
                  <XPIndicator depthChange={lastDepthChange} isUser />
                </div>



                <AnimatePresence>
                  {limitReached && !isUnlimitedPeriod && (
                    <motion.div
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 40, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="px-6 py-3 flex items-center gap-3"
                      style={{
                        background: 'rgba(45,156,219,0.08)',
                        borderTop: '1px solid rgba(45,156,219,0.25)',
                      }}
                    >
                      <Zap className="w-4 h-4 shrink-0" style={{ color: '#2D9CDB' }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-white">Daily limit reached</span>
                        <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,0.45)' }}>Upgrade for unlimited messages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setLimitReached(false)} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <X className="w-4 h-4" />
                        </button>
                        <Link href="/upgrade" className="px-4 py-1.5 rounded-xl text-xs font-black text-black"
                          style={{ background: 'linear-gradient(135deg, #2D9CDB, #0098db)' }}>
                          Go Pro
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>


                <>
                  {showPushPrompt && (
                    <PushPrompt onDismiss={handlePushPromptDismiss} />
                  )}
                  <ChatInput onSend={sendHandler} disabled={loading}
                    selectedSession={selectedSession} replyTo={replyTo}
                    onCancelReply={handleCancelReply} initialText={practicePrompt} />
                </>
              </>
            ) : chatSessionsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 relative z-10 w-full h-full pb-8">
                <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--border)] skeleton"></div>
                <div className="space-y-3 w-full max-w-[280px] mt-4">
                  <div className="skeleton h-3.5 rounded-full w-full mx-auto max-w-[220px]" />
                  <div className="skeleton h-2.5 rounded-full w-3/4 mx-auto max-w-[160px]" />
                </div>
              </div>
            ) : sessions.length === 0 ? (
              <EmptyChatState onStart={() => setIsStudioOpen(true)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--border)] shadow-[0_0_30px_rgba(0,212,212,0.05)] text-[var(--accent-cyan)]"><Bot className="w-8 h-8" /></div>
                <p className="text-[12px] font-black uppercase tracking-[0.35em] text-[var(--foreground-subtle)] mt-2">
                  Select a conversation
                </p>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setIsStudioOpen(true)}
                  className="mt-6 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                  style={{ background: 'rgba(0,212,212,0.08)', border: '1px solid rgba(0,212,212,0.2)', color: 'var(--accent-cyan)' }}>
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  New Chat
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatErrorBoundary>
  );
}
