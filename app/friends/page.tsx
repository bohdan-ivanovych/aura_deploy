'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, Clock, Check, X, Trash2, Anchor } from 'lucide-react';
import { toast } from 'sonner';
import { useStats } from '@/lib/contexts/stats-context';

interface FriendUser {
  id: string;
  name: string | null;
  email: string;
  xp: number;
  streak: number;
  diveDepth: number;
  lastActiveAt: string | null;
}

interface Friendship {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: string;
  sender?: FriendUser;
  receiver?: FriendUser;
}

const MAX_DEPTH = 200;

function Avatar({ user }: { user: FriendUser }) {
  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();
  return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-black text-[var(--foreground)] opacity-80">{initials}</span>
    </div>
  );
}

function LastActiveLabel({ lastActiveAt }: { lastActiveAt: string | null }) {
  if (!lastActiveAt) return null;
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return <span className="text-[10px] font-medium" style={{ color: '#22c55e' }}>dove today</span>;
  }
  if (diffDays === 1) {
    return <span className="text-[10px]" style={{ color: 'var(--foreground-subtle)' }}>last dove {diffHours}h ago</span>;
  }
  return <span className="text-[10px] font-medium" style={{ color: '#f97316' }}>surfacing — {diffDays} days</span>;
}

function OceanBar({ userDepth, friendDepth }: { userDepth: number; friendDepth: number }) {
  const userPct = Math.min(100, (userDepth / MAX_DEPTH) * 100);
  const friendPct = Math.min(100, (friendDepth / MAX_DEPTH) * 100);
  const friendIsDeeper = friendDepth > userDepth;

  const minPct = Math.min(userPct, friendPct);
  const maxPct = Math.max(userPct, friendPct);
  const gapColor = friendIsDeeper ? 'rgba(239,68,68,0.22)' : 'rgba(34,197,94,0.22)';

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {minPct !== maxPct && (
          <div
            className="absolute top-0 bottom-0 transition-all duration-500"
            style={{ left: `${minPct}%`, width: `${maxPct - minPct}%`, background: gapColor }}
          />
        )}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${userPct}%`,
            background: 'linear-gradient(90deg, #00d4d4, #0098db)',
            boxShadow: '0 0 8px rgba(0,212,212,0.5)',
            transition: 'width 0.5s ease',
          }}
        />
        <div
          className="absolute top-0 h-full w-0.5"
          style={{
            left: `${friendPct}%`,
            background: friendIsDeeper ? '#ef4444' : '#22c55e',
            boxShadow: `0 0 6px ${friendIsDeeper ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'}`,
            transition: 'left 0.5s ease',
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-mono" style={{ color: '#00d4d4' }}>You · {userDepth}m</span>
        <span
          className="text-[9px] font-mono font-bold"
          style={{ color: friendIsDeeper ? '#ef4444' : '#22c55e' }}
        >
          {friendIsDeeper ? '▼' : '▲'} {friendDepth}m
        </span>
      </div>
    </div>
  );
}

function FriendCard({
  friendship,
  perspective,
  userDiveDepth,
  onAccept,
  onDecline,
  onRemove,
}: {
  friendship: Friendship;
  perspective: 'sent' | 'received';
  userDiveDepth: number;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
}) {
  const user = perspective === 'sent' ? friendship.receiver! : friendship.sender!;
  const isPending = friendship.status === 'PENDING';
  const isAccepted = friendship.status === 'ACCEPTED';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <Avatar user={user} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--foreground)] truncate">{user.name ?? user.email}</p>
          {user.name && (
            <p className="text-[11px] text-[var(--foreground-subtle)] truncate">{user.email}</p>
          )}
          {isAccepted && <LastActiveLabel lastActiveAt={user.lastActiveAt} />}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isPending && perspective === 'received' && (
            <>
              <button
                onClick={onAccept}
                className="w-8 h-8 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center hover:bg-green-500/30 transition-colors"
              >
                <Check className="w-4 h-4 text-green-400" />
              </button>
              <button
                onClick={onDecline}
                className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </>
          )}

          {isPending && perspective === 'sent' && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-black text-yellow-400 uppercase tracking-wider">
              <Clock className="w-3 h-3" />Pending
            </span>
          )}

          {(isAccepted || (isPending && perspective === 'sent')) && (
            <button
              onClick={onRemove}
              className="w-8 h-8 rounded-xl bg-[var(--surface-active)] border border-[var(--border)] flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-colors group"
            >
              <Trash2 className="w-4 h-4 text-[var(--foreground-subtle)] group-hover:text-red-400 transition-colors" />
            </button>
          )}

          {isAccepted && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
              <Anchor className="w-3 h-3" />Crew
            </span>
          )}
        </div>
      </div>

      {isAccepted && (
        <OceanBar userDepth={userDiveDepth} friendDepth={user.diveDepth ?? 0} />
      )}
    </motion.div>
  );
}

export default function FriendsPage() {
  const { stats } = useStats();
  const [sent, setSent] = useState<Friendship[]>([]);
  const [received, setReceived] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [isSending, setIsSending] = useState(false);

  const userDiveDepth = stats?.diveDepth ?? 0;

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setSent(data.sent ?? []);
        setReceived(data.received ?? []);
      }
    } catch {
      toast.error('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send request');
      } else {
        toast.success('Diver added to your crew!');
        setIdentifier('');
        load();
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSending(false);
    }
  };

  const patchFriendship = async (id: string, status: 'ACCEPTED' | 'BLOCKED') => {
    try {
      const res = await fetch(`/api/friends/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === 'ACCEPTED' ? 'Diver joined your crew!' : 'Request declined.');
        load();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const removeFriendship = async (id: string) => {
    try {
      const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Diver removed from your crew.');
        load();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const pendingIncoming = received.filter(f => f.status === 'PENDING');
  const acceptedFriends = [
    ...sent.filter(f => f.status === 'ACCEPTED'),
    ...received.filter(f => f.status === 'ACCEPTED'),
  ];
  const pendingSent = sent.filter(f => f.status === 'PENDING');

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-cyan-400" />
          Crew
        </h1>
        <p className="text-xs text-[var(--foreground-subtle)] mt-1 uppercase tracking-widest font-black">
          {acceptedFriends.length} diving with you
        </p>
      </div>

      <form onSubmit={sendRequest} className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-2">
          Add diver by username or email
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="@username or email"
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !identifier.trim()}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-black disabled:opacity-40 hover:bg-cyan-500/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {isSending ? '…' : 'Add'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {pendingIncoming.length > 0 && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-widest text-fuchsia-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                Incoming requests ({pendingIncoming.length})
              </p>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {pendingIncoming.map(f => (
                    <FriendCard
                      key={f.id}
                      friendship={f}
                      perspective="received"
                      userDiveDepth={userDiveDepth}
                      onAccept={() => patchFriendship(f.id, 'ACCEPTED')}
                      onDecline={() => patchFriendship(f.id, 'BLOCKED')}
                      onRemove={() => removeFriendship(f.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </section>
          )}

          {acceptedFriends.length > 0 && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-widest text-cyan-400 mb-3">
                Dive Crew
              </p>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {acceptedFriends.map(f => (
                    <FriendCard
                      key={f.id}
                      friendship={f}
                      perspective={f.sender ? 'received' : 'sent'}
                      userDiveDepth={userDiveDepth}
                      onRemove={() => removeFriendship(f.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </section>
          )}

          {pendingSent.length > 0 && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--foreground-subtle)] mb-3">
                Sent requests
              </p>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {pendingSent.map(f => (
                    <FriendCard
                      key={f.id}
                      friendship={f}
                      perspective="sent"
                      userDiveDepth={userDiveDepth}
                      onRemove={() => removeFriendship(f.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </section>
          )}

          {acceptedFriends.length === 0 && pendingIncoming.length === 0 && pendingSent.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto mb-3 text-[var(--foreground-subtle)] opacity-50" />
              <p className="text-sm font-black uppercase tracking-widest text-[var(--foreground-muted)]">No crew yet</p>
              <p className="text-xs mt-1 text-[var(--foreground-subtle)]">Add a diver above to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
