'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

type Persona = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

type Message = {
  id?: string;
  text: string;
  createdAt?: string | Date | null;
};

type ChatSession = {
  id: string;
  persona: Persona;
  messages: Message[];
  unreadCount?: number;
};

interface MobileChatListProps {
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onOpenStudio: () => void;
}

export function MobileChatList({ sessions, onSelectSession, onOpenStudio }: MobileChatListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 relative" style={{ background: 'var(--background)' }}>
      <header className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Chats</h1>
        <button 
          onClick={onOpenStudio} 
          className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none"
        >
          <Plus className="w-5 h-5 text-[var(--accent-cyan)]" />
        </button>
      </header>
      {sessions.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i).map(session => {
        const lastMsg = session.messages[session.messages.length - 1];
        const unreadCount = session.unreadCount || 0;
        
        let displayTime = '';
        if (lastMsg && lastMsg.createdAt) {
          try {
            displayTime = new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {}
        }
        
        return (
          <motion.button 
            key={session.id} 
            onClick={() => onSelectSession(session.id)}
            whileTap={{ scale: 0.98 }}
            className="w-full relative p-4 rounded-3xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] flex items-center gap-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-cyan-500/20 to-[var(--accent-quaternary)]/20 border-2 border-[var(--border)] flex items-center justify-center text-lg font-black text-[var(--foreground-muted)] relative">
              {session.persona.avatarUrl
                ? <img src={session.persona.avatarUrl} className="w-full h-full object-cover" alt={session.persona.name} />
                : session.persona.name.charAt(0).toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[15px] font-black text-[var(--foreground)] truncate pr-2">{session.persona.name}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-subtle)] shrink-0">
                  {displayTime}
                </span>
              </div>
              <p className="text-[13px] text-[var(--foreground-muted)] font-medium truncate leading-tight">
                {lastMsg ? lastMsg.text : 'Start a conversation…'}
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center text-[10px] font-black text-black shadow-[0_0_10px_var(--glow-cyan)]">
                {unreadCount}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
