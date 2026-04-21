import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight, UserPlus, Zap, Flame, Loader2 } from 'lucide-react';
import Link from 'next/link';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

interface Props {
  friends: any[];
  pendingIn: number;
  friendInput: string;
  setFriendInput: (v: string) => void;
  sendFriendRequest: (e: React.FormEvent) => Promise<void>;
  isSendingFriend: boolean;
  isDark: boolean;
}

export function CrewCard({
  friends, pendingIn, friendInput, setFriendInput,
  sendFriendRequest, isSendingFriend, isDark
}: Props) {
  const [friendError, setFriendError] = useState<string | null>(null);
  const cardBg = 'var(--surface)';
  const cardBorder = 'var(--border)';
  const cardShadow = 'var(--card-shadow, 0 4px 32px rgba(0,0,0,0.4))';
  const textPrimary = 'var(--foreground)';
  const textSubtle = 'var(--foreground-subtle)';
  const textMuted = 'var(--foreground-muted)';
  const divider = 'var(--border-subtle, var(--border))';

  const handleSubmit = async (e: React.FormEvent) => {
    setFriendError(null);
    try {
      await sendFriendRequest(e);
    } catch (err: any) {
      setFriendError(err?.message ?? 'Failed to send request');
    }
  };

  return (
    <motion.section
      aria-label="Crew"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.22 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: isDark ? 'blur(24px)' : 'none' }}
    >
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${divider}` }}>
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
          <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: textSubtle }}>Crew</h2>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
            {friends.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingIn > 0 && (
            <Link href="/friends">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black"
                style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                {pendingIn} request{pendingIn > 1 ? 's' : ''}
              </span>
            </Link>
          )}
          <Link href="/friends">
            <motion.span whileHover={{ x: 2 }} transition={SPRING}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] opacity-35 hover:opacity-65 transition-opacity">
              All <ChevronRight className="w-3 h-3" />
            </motion.span>
          </Link>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <form onSubmit={handleSubmit} className="flex gap-2" noValidate>
          <label htmlFor="crew-friend-input" className="sr-only">Add friend by username or email</label>
          <input
            id="crew-friend-input"
            type="text"
            value={friendInput}
            onChange={e => { setFriendInput(e.target.value); setFriendError(null); }}
            placeholder="@username or email"
            autoComplete="email"
            inputMode="email"
            className="flex-1 px-3 rounded-xl outline-none transition-colors"
            style={{
              fontSize: '16px', /* Prevents iOS zoom */
              minHeight: '44px',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${friendError ? 'rgba(239,68,68,0.5)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
              color: textPrimary,
            }}
          />
          <button
            type="submit"
            disabled={isSendingFriend || !friendInput.trim()}
            aria-label="Send friend request"
            className="flex items-center gap-1.5 px-4 rounded-xl font-black disabled:opacity-40 transition-colors"
            style={{
              fontSize: '13px',
              minHeight: '44px',
              minWidth: '44px',
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399',
            }}
          >
            {isSendingFriend
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <UserPlus className="w-3.5 h-3.5" />}
            {isSendingFriend ? '' : 'Add'}
          </button>
        </form>
        {friendError && (
          <p role="alert" className="text-xs mt-1.5 px-1" style={{ color: '#ef4444', fontSize: '13px' }}>
            {friendError}
          </p>
        )}
      </div>

      {friends.length > 0 ? (
        <div className="px-4 pb-4 pt-2 space-y-2">
          {friends.slice(0, 3).map(f => {
            const initials = f.name
              ? f.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              : f.email[0].toUpperCase();
            return (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-2xl transition-colors"
                style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                  style={{ background: 'linear-gradient(135deg,rgba(0,212,212,0.25),rgba(167,139,250,0.2))', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, color: isDark ? '#00d4d4' : '#0891b2' }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>{f.name ?? f.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-0.5 text-[9px] font-black" style={{ color: '#00d4d4' }}>
                    <Zap className="w-2.5 h-2.5" />{f.xp.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5 text-[9px] font-black" style={{ color: '#f97316' }}>
                    <Flame className="w-2.5 h-2.5" />{f.streak}d
                  </span>
                </div>
              </div>
            );
          })}
          {friends.length > 3 && (
            <Link href="/friends">
              <p className="text-center text-[10px] font-black py-1.5 transition-opacity hover:opacity-70" style={{ color: textSubtle }}>
                +{friends.length - 3} more →
              </p>
            </Link>
          )}
        </div>
      ) : (
        <div className="px-4 py-5 text-center">
          <div className="w-10 h-10 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center mx-auto mb-2.5 opacity-60">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs font-bold mb-1" style={{ color: textPrimary }}>No crew yet</p>
          <p className="text-[10px]" style={{ color: textMuted }}>Add friends to compare stats and dive deeper together.</p>
        </div>
      )}
    </motion.section>
  );
}
