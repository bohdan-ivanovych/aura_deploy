import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { DailyBounties } from '@/components/chat/DailyBounties';

interface ChatSidebarProps {
  sessions: any[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onOpenStudio: () => void;
}

export function ChatSidebar({
  sessions,
  selectedSessionId,
  onSelectSession,
  onOpenStudio,
}: ChatSidebarProps) {
  return (
    <div className="w-72 flex flex-col h-full flex-shrink-0"
      style={{ background: 'var(--chat-sidebar-bg)', borderRight: '1px solid var(--border)', transform: 'translateZ(0)', isolation: 'isolate' }}>
      <div className="p-4 shrink-0 space-y-3">
        {sessions.length > 0 && <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--foreground-subtle)]">Conversations</span>}
        {sessions.length > 0 && (
          <motion.button whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
            onClick={onOpenStudio}
            className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,212,0.15), rgba(0,152,219,0.1))', border: '1px solid rgba(0,212,212,0.2)', color: 'var(--accent-cyan)' }}>
            <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            New Chat
          </motion.button>
        )}
      </div>

      <DailyBounties />

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 no-scrollbar">
        {sessions.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i).map(session => {
          const isSelected = selectedSessionId === session.id;
          const lastMsg = session.messages[session.messages.length - 1];
          return (
            <motion.button key={session.id} onClick={() => onSelectSession(session.id)}
              whileTap={{ scale: 0.99 }}
              className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 text-left group ${session.blockedBy ? 'opacity-50' : ''}`}
              style={isSelected
                ? { background: 'rgba(0,212,212,0.1)', border: '1px solid rgba(0,212,212,0.15)' }
                : { background: 'transparent', border: '1px solid transparent' }}>
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-black"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,212,0.3), rgba(0,152,219,0.2))', border: '1px solid rgba(0,212,212,0.2)', color: isSelected ? 'var(--accent-cyan)' : 'var(--foreground-muted)' }}>
                {session.persona.avatarUrl
                  ? <img src={session.persona.avatarUrl} className="w-full h-full object-cover" alt={session.persona.name} />
                  : session.persona.name.charAt(0).toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-[12px] font-bold truncate ${isSelected ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}`}>
                    {session.persona.name}
                  </p>
                  {session.blockedBy
                    ? <span className="text-[8px] text-red-400 font-black uppercase">blocked</span>
                    : isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0 ml-2" style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 6px rgba(0,212,212,0.8)' }} />
                  }
                </div>
                <p className="text-[10px] text-[var(--foreground-subtle)] truncate font-medium mt-0.5">
                  {lastMsg ? lastMsg.text : 'Start a conversation…'}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
