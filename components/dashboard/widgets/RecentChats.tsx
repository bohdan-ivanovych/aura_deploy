import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

interface Props {
  sessions: any[];
  profileDataLoading: boolean;
  isDark: boolean;
}

export function RecentChats({ sessions, profileDataLoading, isDark }: Props) {
  const cardBg = 'var(--surface)';
  const cardBorder = 'var(--border)';
  const textPrimary = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';
  const textSubtle = 'var(--foreground-subtle)';
  const skeletonBg = 'var(--surface-hover)';
  const skeletonBorder = 'var(--border)';
  const focusBorder = 'var(--border)';

  return (
    <motion.section
      aria-label="Recent conversations"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.18 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: isDark ? '#e040fb' : '#a21caf' }} />
          <h2 className="text-[11px] font-black tracking-[0.1em] uppercase">Recent Chats</h2>
        </div>
        <Link href="/chat">
          <motion.span whileHover={{ x: 2 }} transition={SPRING}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] opacity-35 hover:opacity-65 transition-opacity">
            Open <ChevronRight className="w-3 h-3" />
          </motion.span>
        </Link>
      </div>

      {profileDataLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 rounded-2xl animate-pulse"
              style={{ background: skeletonBg, border: `1px solid ${skeletonBorder}` }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl py-6 flex flex-col items-center gap-2"
          style={{ background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)', border: `1px solid ${focusBorder}` }}>
          <MessageSquare className="w-6 h-6 opacity-15" />
          <p className="text-[11px] font-medium" style={{ color: textMuted }}>No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const lastMsg = session.messages[session.messages.length - 1];
            return (
              <Link key={session.id} href="/chat">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    backdropFilter: isDark ? 'blur(16px)' : 'none',
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      background: isDark ? 'linear-gradient(135deg, rgba(0,212,212,0.2), rgba(167,139,250,0.15))' : 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(124,58,237,0.1))',
                      border: `1px solid ${isDark ? 'rgba(0,212,212,0.22)' : 'rgba(8,145,178,0.22)'}`,
                    }}>
                    {session.persona.avatarUrl
                      ? <img src={session.persona.avatarUrl} alt={session.persona.name} className="w-full h-full object-cover" />
                      : <span className="text-xs font-black" style={{ color: isDark ? '#00d4d4' : '#0891b2' }}>
                          {session.persona.name.charAt(0).toUpperCase()}
                        </span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold truncate block" style={{ color: textPrimary }}>
                      {session.persona.name}
                    </span>
                    <p className="text-[11px] truncate" style={{ color: textMuted }}>
                      {lastMsg ? lastMsg.text : 'No messages'}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: textSubtle }} />
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
