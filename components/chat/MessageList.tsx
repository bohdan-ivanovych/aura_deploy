'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, BookOpen, ChevronDown, MousePointer2, Eye } from 'lucide-react';
import { ChatMessage, ReplyTarget } from '@/components/chat/ChatMessage';
import { DailyBounties } from '@/components/chat/DailyBounties';
import { haptics } from '@/lib/utils/haptics';

// Types (typically you'd import these from a shared types file)
type Message = any; // Will use the same structure as in ChatClient for now
type ChatSession = any;

interface MessageListProps {
  messages: Message[];
  selectedSession: ChatSession | null;
  selectedSessionId: string | null;
  loading: boolean;
  typingSessionId: string | null;
  isWatching?: boolean;
  multiPersona: boolean;
  targetAccent: 'us' | 'gb';
  
  // Handlers
  onEditMessage: (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
  onExplainMsg: (text: string) => void;
  onReply: (target: ReplyTarget) => void;
  onReaction: (msgId: string, emoji: string | null) => void;
  onReelToggle: (id: string) => void;
  onWordPopupRead: () => void;

  // UI State
  reelMode: boolean;
  selectedMsgIds: Set<string>;
  editingMessageId: string | null;
  reelSelectionOrder: Record<string, number>;
  onScroll?: (scrollTop: number) => void;
}

function WordHintBadge() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('aura_word_hint_seen')) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => {
      setVisible(false);
      localStorage.setItem('aura_word_hint_seen', '1');
    }, 6000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.4 }}
      onClick={() => { setVisible(false); if (typeof window !== 'undefined') localStorage.setItem('aura_word_hint_seen', '1'); }}
      className="ml-10 mt-1 mb-2 flex items-center gap-2 cursor-pointer select-none w-fit"
      style={{ touchAction: 'manipulation' }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
        style={{
          background: 'rgba(0,212,212,0.1)',
          border: '1px solid rgba(0,212,212,0.22)',
          color: 'rgba(0,212,212,0.85)',
        }}
      >
        <MousePointer2 className="w-3.5 h-3.5" />
        <span>Tap any word to save or listen</span>
      </div>
    </motion.div>
  );
}

function WeaknessHintBadge() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('aura_weakness_hint_seen')) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => {
      setVisible(false);
      localStorage.setItem('aura_weakness_hint_seen', '1');
    }, 8000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.2 }}
      onClick={() => { setVisible(false); if (typeof window !== 'undefined') localStorage.setItem('aura_weakness_hint_seen', '1'); }}
      className="ml-auto mr-4 mt-1 mb-2 flex items-center gap-2 cursor-pointer select-none w-fit"
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.22)',
          color: 'rgba(239,68,68,0.85)',
        }}
      >
        <MousePointer2 className="w-3.5 h-3.5" />
        <span>Tap the underlined word to see what went wrong</span>
      </div>
    </motion.div>
  );
}

const GROUP_WINDOW_MS = 60_000;

export function MessageList({
  messages,
  selectedSession,
  selectedSessionId,
  loading,
  typingSessionId,
  isWatching,
  multiPersona,
  targetAccent,
  onEditMessage,
  onDeleteMessage,
  onExplainMsg,
  onReply,
  onReelToggle,
  onWordPopupRead,
  onReaction,
  reelMode,
  selectedMsgIds,
  editingMessageId,
  reelSelectionOrder,
  onScroll,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const [renderLimit, setRenderLimit] = useState(20);
  const initialMsgCountRef = useRef(messages.length);
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(messages.length);

  const handleScrollContainer = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 100;
    setShowScrollBtn(distFromBottom > 200);
    if (isNearBottomRef.current) setUnreadWhileScrolled(0);
    
    // Viewport slicing: Load older messages smoothly when scrolling up
    if (el.scrollTop < 600 && renderLimit < messages.length) {
      setRenderLimit(prev => Math.min(prev + 15, messages.length));
    }
    
    onScroll?.(el.scrollTop);
  }, [onScroll, renderLimit, messages.length]);

  const scrollToBottomNow = useCallback(() => {
    haptics.light();
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadWhileScrolled(0);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Reset tracking when switching sessions
  useEffect(() => {
    setRenderLimit(20);
    initialMsgCountRef.current = messages.length;
  }, [selectedSessionId]);

  // Smart auto-scroll
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;

    if (newCount <= prevCount) return; // no new messages

    const lastMsg = messages[newCount - 1];
    const userJustSent = lastMsg?.sender === 'USER';

    if (userJustSent) {
      scrollToBottom('instant');
    } else if (isNearBottomRef.current) {
      scrollToBottom(loading ? 'instant' : 'smooth');
    } else {
      setUnreadWhileScrolled(prev => prev + (newCount - prevCount));
    }
  }, [messages.length, loading, scrollToBottom]);

  const computeGroups = (msgs: Message[]) => {
    return msgs.map((msg, idx) => {
      const prev = msgs[idx - 1];
      const next = msgs[idx + 1];
      const sameSenderAsPrev = prev && (prev.sender === msg.sender) &&
        Math.abs(new Date(msg.createdAt || 0).getTime() - new Date(prev.createdAt || 0).getTime()) < GROUP_WINDOW_MS;
      const sameSenderAsNext = next && (next.sender === msg.sender) &&
        Math.abs(new Date(next.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime()) < GROUP_WINDOW_MS;
      return {
        isFirstInGroup: !sameSenderAsPrev,
        isLastInGroup:  !sameSenderAsNext,
      };
    });
  };

  const getReplyToMsg = (msg: Message) => {
    if (!msg.replyToId) return null;
    const found = messages.find(m => m.id === msg.replyToId);
    if (!found) return null;
    return { id: found.id!, text: found.text, sender: found.sender === 'USER' ? 'USER' as const : 'AI' as const };
  };

  const groups = useMemo(() => computeGroups(messages), [messages]);

  const renderMessages = () => {
    const result: React.ReactNode[] = [];

    // Precompute these ONLY if they are within the visible slice to save CPU
    // The learning plan is shown after 5 total messages (idx === 4)
    const showLearningPlanIdx = 4;
    const isLearningPlanVisible = (showLearningPlanIdx >= messages.length - renderLimit) && (showLearningPlanIdx < messages.length);

    let cachedUserMsgsBefore = 0;
    let cachedWeaknesses: string[] = [];
    if (isLearningPlanVisible) {
      const sliceBefore = messages.slice(0, showLearningPlanIdx + 1);
      cachedUserMsgsBefore = sliceBefore.filter((m: any) => m.sender === 'USER').length;
      cachedWeaknesses = sliceBefore.map(m => m.weaknessIdentified).filter(Boolean) as string[];
    }

    let lastDate: string | null = null;
    let weaknessHintShown = false;

    messages.forEach((msg, idx) => {
      // Skip rendering if outside out viewport slice (Virtualization)
      if (idx < messages.length - renderLimit) return;
      
      const isHistorical = idx < initialMsgCountRef.current;

      // Date separator (Telegram style)
      const msgDate = new Date(msg.createdAt || Date.now()).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });

      if (msgDate !== lastDate) {
        lastDate = msgDate;
        const isToday = new Date().toLocaleDateString('en-US') === new Date(msg.createdAt || Date.now()).toLocaleDateString('en-US');
        
        result.push(
          <div key={`date-${msgDate}-${idx}`} className="flex justify-center mt-8 mb-4 pointer-events-none">
            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider liquid-glass-dark text-white/50 border border-white/5 shadow-sm pointer-events-auto select-none">
              {isToday ? 'Today' : msgDate}
            </div>
          </div>
        );
      }
      // System dividers (call ended, etc.)
      if (msg.isSystemDivider) {
        result.push(
          <div key={msg.id || `divider-${idx}`} className="flex items-center justify-center gap-3 my-3">
            <div className="flex-1 h-px opacity-20" style={{ background: 'var(--foreground)' }} />
            <span className="text-[10px] font-semibold text-[var(--foreground-subtle)] px-1">
              {msg.systemDividerText || msg.text}
            </span>
            <div className="flex-1 h-px opacity-20" style={{ background: 'var(--foreground)' }} />
          </div>
        );
        return;
      }

      const ctx = messages
        .slice(Math.max(0, idx - 2), idx + 1)
        .map(m => ({ text: m.text, sender: m.sender === 'USER' ? 'user' as const : 'ai' as const }));

      const { isFirstInGroup, isLastInGroup } = groups[idx];
      const showWordHint = msg._showWordHint === true;

      result.push(
        <ChatMessage
          key={msg.id || `optimistic-${idx}`}
          message={msg.text}
          senderType={msg.sender === 'USER' ? 'USER_A' : 'AI_PERSONA'}
          grammarCorrection={msg.grammarCorrection}
          weaknessIdentified={msg.weaknessIdentified}
          vocabularyNote={msg.vocabularyNote}
          vibeNote={msg.vibeNote}
          xpReward={msg.xpReward}
          suggestion={msg.suggestion}
          errorSpan={msg.errorSpan}
          metrics={(msg as any).metrics}
          conversationContext={ctx}
          persona={selectedSession?.persona.name || 'AI Assistant'}
          voiceId={(() => {
            const p: any = selectedSession?.persona;
            if (!p) return null;
            const vs = p.voiceSettings;
            if (vs) return (targetAccent === 'gb' ? vs.gb : vs.us) ?? p.voiceId ?? null;
            return p.voiceId ?? null;
          })()}
          createdAt={msg.createdAt}
          messageId={msg.id}
          isEditing={editingMessageId === msg.id}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onExplain={msg.sender !== 'USER' ? onExplainMsg : undefined}
          onReply={reelMode ? undefined : (msg.id ? onReply : undefined)}
          edited={msg.edited}
          replyTo={reelMode ? null : getReplyToMsg(msg)}
          reelMode={reelMode}
          isReelSelected={!!msg.id && selectedMsgIds.has(msg.id)}
          reelSelectionIndex={msg.id ? reelSelectionOrder[msg.id] : undefined}
          onReelToggle={onReelToggle}
          onWordPopupRead={msg.sender === 'USER' ? onWordPopupRead : undefined}
          reaction={msg.reaction ?? null}
          onReaction={msg.id ? onReaction : undefined}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          showAvatar={multiPersona && msg.sender === 'AI' && isLastInGroup}
          senderName={multiPersona && msg.sender === 'AI' ? (msg.senderName ?? null) : null}
          senderAvatar={multiPersona && msg.sender === 'AI' ? (msg.senderAvatar ?? null) : null}
          readState={msg.readState ?? null}
          isAudio={msg.isAudio ?? false}
          audioDuration={msg.audioDuration ?? null}
          showMagicHint={showWordHint}
          isHistorical={isHistorical}
          tiktokNote={msg.tiktokNote ?? null}
        />
      );

      // Word hint for first AI message
      if (showWordHint) {
        result.push(
          <WordHintBadge key={`word-hint-${idx}`} />
        );
      }

      // Weakness hint for the first message with errorSpan/weaknessIdentified
      if (!weaknessHintShown && msg.weaknessIdentified) {
        weaknessHintShown = true;
        result.push(
          <WeaknessHintBadge key={`weakness-hint-${idx}`} />
        );
      }

      // No session dividers — removed


      if (idx === showLearningPlanIdx && cachedUserMsgsBefore >= 3) {
        const foundWeaknesses = cachedWeaknesses.filter(Boolean);
        const uniqueWeaknesses = [...new Set(foundWeaknesses)];
        result.push(
          <motion.div
            key="learning-plan"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.2 }}
            className="my-4 mx-auto max-w-sm"
          >
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div className="flex items-center gap-2 px-4 py-2.5"
                style={{ background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
                <Brain className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
                <span className="text-[9px] font-black uppercase tracking-[0.22em]"
                  style={{ color: '#a78bfa' }}>
                  Personalized Learning Plan
                </span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Based on your first messages, here's what to focus on:
                </p>
                {uniqueWeaknesses.length > 0 ? (
                  <div className="space-y-1.5">
                    {uniqueWeaknesses.slice(0, 3).map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-black"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          {i + 1}
                        </div>
                        <span className="text-[11px] capitalize font-medium text-[var(--foreground)]">{w}</span>
                      </div>
                    ))}
                    {uniqueWeaknesses.length > 3 && (
                      <p className="text-[9px] text-[var(--foreground-subtle)]">
                        +{uniqueWeaknesses.length - 3} more areas identified
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                    <span className="text-[11px]" style={{ color: 'rgba(52,211,153,0.9)' }}>
                      Great start! Keep practicing to unlock more insights.
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <BookOpen className="w-3 h-3" style={{ color: 'rgba(167,139,250,0.6)' }} />
                  <span className="text-[9px] text-[var(--foreground-subtle)]">
                    Plan updates as you practice more
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      }
    });
    return result;
  };

  return (
    <div 
      className="flex-1 overflow-y-auto px-3 py-3 md:px-6 md:py-5 min-w-0 h-full relative no-scrollbar"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        overflowAnchor: 'auto', // prevents scroll jumping when prepping older messages
        backgroundImage: 'radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      ref={scrollContainerRef}
      onScroll={handleScrollContainer}
    >
      <div className="max-w-5xl w-full mx-auto px-1 md:px-8 flex flex-col min-h-full gap-1">
        {messages.filter(m => m.sender === 'USER').length === 0 && (
          <div className="mb-4 md:mb-6">
            <DailyBounties />
          </div>
        )}
        
        {/* Render loading spinner if there are more messages to load above */}
        {renderLimit < messages.length && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent-cyan)] animate-spin" />
          </div>
        )}
        
        {renderMessages()}
        
        {(typingSessionId === selectedSessionId || isWatching) && (
          <div className="flex items-end gap-2 pl-1 md:pl-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl md:rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs md:text-sm font-bold"
              style={{ background: 'rgba(0,212,212,0.15)', border: '1px solid rgba(0,212,212,0.2)', color: 'var(--accent-cyan)' }}>
              {selectedSession?.persona.avatarUrl
                ? <img src={selectedSession.persona.avatarUrl} className="w-full h-full object-cover" alt="" />
                : selectedSession?.persona.name?.charAt(0).toUpperCase()
              }
            </div>
            <div className="px-3 py-2 md:px-4 md:py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2 animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {isWatching ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Watching...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} data-messages-end />
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            onClick={scrollToBottomNow}
            className="fixed md:absolute bottom-32 md:bottom-28 right-4 md:right-8 w-10 h-10 rounded-full flex items-center justify-center z-20"
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
            {unreadWhileScrolled > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
                style={{ background: '#2D9CDB', boxShadow: '0 0 8px rgba(45,156,219,0.6)' }}
              >
                {unreadWhileScrolled > 99 ? '99+' : unreadWhileScrolled}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
