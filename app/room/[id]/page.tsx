'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { pusherClient } from '@/lib/services/pusher-client';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { UserPlus, Swords, Crown, Zap } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';

interface Message {
  id: string;
  text: string;
  senderType: 'USER_A' | 'USER_B' | 'AI_PERSONA';
  grammarCorrection?: string | null;
  weaknessIdentified?: string | null;
  xpReward?: number;
}

const AITypingIndicator = () => (
  <motion.div
    key="ai-typing"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex justify-center w-full mb-8"
  >
    <div className="flex items-center gap-3 px-6 py-3 rounded-full"
      style={{
        background: 'rgba(168,85,247,0.12)',
        border: '1px solid rgba(168,85,247,0.35)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 30px rgba(168,85,247,0.2)',
      }}>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">
        Aura judging…
      </p>
    </div>
  </motion.div>
);

const EmptyRoomState = ({ senderType }: { senderType: 'USER_A' | 'USER_B' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center"
  >
    <div className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,212,0.15), rgba(168,85,247,0.15))',
        border: '1px solid rgba(0,212,212,0.3)',
        boxShadow: '0 0 60px rgba(0,212,212,0.15)',
      }}>
      <Swords className="w-9 h-9 text-cyan-400" />
    </div>
    <div className="space-y-2">
      <h2 className="text-xl font-black tracking-tight text-white">Grammar Deathmatch</h2>
      <p className="text-sm text-white/40 max-w-[240px] leading-relaxed">
        You are{' '}
        <span className={senderType === 'USER_A' ? 'text-cyan-400 font-bold' : 'text-fuchsia-400 font-bold'}>
          Player {senderType === 'USER_A' ? '1' : '2'}
        </span>
        . Send a message to begin — Aura will judge every exchange.
      </p>
    </div>
    <div className="flex items-center gap-4 text-[10px] text-white/25 font-bold uppercase tracking-widest">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-cyan-500" />
        Player 1
      </div>
      <span>VS</span>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
        Player 2
      </div>
    </div>
  </motion.div>
);

export default function RoomPage() {
  const { id: roomId } = useParams();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [senderType, setSenderType] = useState<'USER_A' | 'USER_B'>('USER_A');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Force deduplication using Map to guarantee unique keys
  const uniqueMessages = Array.from(new Map(messages.map(m => [m.id, m])).values());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch the current user's ID from settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.id) setUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load room history', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    const channel = pusherClient?.subscribe(`room-${roomId}`);

    const handleNewMessage = (data: Message) => {
      if (data.senderType === 'AI_PERSONA') {
        setIsAITyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
      setMessages((prev) => {
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    channel?.bind('new-message', handleNewMessage);

    return () => {
      channel?.unbind('new-message', handleNewMessage);
      pusherClient?.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  useEffect(() => {
    const stored = localStorage.getItem(`room-${roomId}-role`);
    if (stored === 'USER_A' || stored === 'USER_B') {
      setSenderType(stored);
    } else {
      setShowRoleModal(true);
    }
  }, [roomId]);

  const chooseRole = (role: 'USER_A' | 'USER_B') => {
    localStorage.setItem(`room-${roomId}-role`, role);
    setSenderType(role);
    setShowRoleModal(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [uniqueMessages, isAITyping, scrollToBottom]);

  const handleInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied! Send it to your opponent.', { duration: 4000 });
    } catch {
      toast.error('Could not copy link. Please copy the URL manually.');
    }
  }, []);

  const handleSend = async (text: string) => {
    setIsAITyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      setIsAITyping(false);
      toast.error('AI response timeout — try again');
    }, 30000);

    try {
      const res = await fetch('/api/room/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, text, senderType, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err) {
      setIsAITyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      toast.error((err as Error).message);
    }
  };

  const isDark = theme !== 'light';
  const playerAColor = '#22d3ee';
  const playerBColor = '#e879f9';
  const myColor = senderType === 'USER_A' ? playerAColor : playerBColor;

  return (
    <div className="flex flex-col h-[100dvh] pt-[env(safe-area-inset-top)] bg-[var(--background)]">
      {/* Role Selection Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="flex flex-col gap-5 items-center max-w-xs w-full mx-4 p-7 rounded-[32px]"
              style={{
                background: 'rgba(12,14,22,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
              }}
            >
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h2 className="text-lg font-black uppercase tracking-widest text-white">Choose Side</h2>
              </div>
              <p className="text-xs text-white/40 text-center leading-relaxed">
                Pick your player. This will be remembered for this room.
              </p>
              <button
                onClick={() => chooseRole('USER_A')}
                className="tap-target w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.1))',
                  border: '1px solid rgba(34,211,238,0.5)',
                  color: '#22d3ee',
                  boxShadow: '0 0 30px rgba(34,211,238,0.2)',
                }}
              >
                <Zap className="w-4 h-4" />
                Player 1 (Cyan)
              </button>
              <button
                onClick={() => chooseRole('USER_B')}
                className="tap-target w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,121,249,0.2), rgba(232,121,249,0.1))',
                  border: '1px solid rgba(232,121,249,0.5)',
                  color: '#e879f9',
                  boxShadow: '0 0 30px rgba(232,121,249,0.2)',
                }}
              >
                <Zap className="w-4 h-4" />
                Player 2 (Violet)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header
        className="shrink-0 relative z-50 px-5 py-4 flex items-center justify-between gap-3"
        style={{
          background: isDark ? 'rgba(10,12,20,0.6)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15))',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
            <Swords className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-[13px] font-black tracking-tight" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>
              Grammar Deathmatch
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}>
              Room · {String(roomId).slice(0, 8)}…
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInvite}
            className="tap-target flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
            style={{
              border: '1px solid rgba(34,211,238,0.4)',
              background: 'rgba(34,211,238,0.08)',
              color: '#22d3ee',
            }}
          >
            <UserPlus className="w-3 h-3" />
            Invite
          </button>

          <div
            className="px-3 py-1.5 rounded-full text-[10px] font-black border"
            style={{
              borderColor: `${myColor}40`,
              background: `${myColor}10`,
              color: myColor,
            }}
          >
            {senderType === 'USER_A' ? 'Player 1' : 'Player 2'}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar relative">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex justify-center">
              <div className="rounded-3xl p-4 max-w-md w-full animate-pulse"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                <div className="h-4 rounded mb-2" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                <div className="h-3 rounded w-3/4" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              </div>
            </div>
          ))
        ) : uniqueMessages.length === 0 ? (
          <EmptyRoomState senderType={senderType} />
        ) : (
          uniqueMessages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m.text}
              senderType={m.senderType}
              grammarCorrection={m.grammarCorrection}
              weaknessIdentified={m.weaknessIdentified}
              xpReward={m.xpReward}
            />
          ))
        )}

        <AnimatePresence>
          {isAITyping && <AITypingIndicator />}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-px" />
      </div>

      {/* Footer */}
      <footer
        className="shrink-0 pb-[env(safe-area-inset-bottom)] relative z-50"
        style={{
          background: isDark ? 'rgba(10,12,20,0.7)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(40px)',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <ChatInput
          onSend={handleSend}
          disabled={isAITyping}
          placeholder={`Message as Player ${senderType === 'USER_A' ? '1' : '2'}…`}
        />
      </footer>
    </div>
  );
}
