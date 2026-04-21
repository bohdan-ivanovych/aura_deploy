'use client';

import { motion } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';

export function EmptyChatState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center z-10 relative">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          boxShadow: [
            'var(--shadow-glow-cyan), inset 0 0 20px rgba(0,212,212,0.1)',
            '0 0 80px rgba(124,58,237,0.4), inset 0 0 40px rgba(124,58,237,0.2)',
            'var(--shadow-glow-cyan), inset 0 0 20px rgba(0,212,212,0.1)',
          ]
        }}
        transition={{
          scale: { type: 'spring', stiffness: 300, damping: 25 },
          boxShadow: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-24 h-24 mb-8 rounded-[40px] flex items-center justify-center relative overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <motion.div
          className="absolute inset-0 opacity-50"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(0,212,212,0.8), rgba(124,58,237,0.2))',
              'linear-gradient(225deg, rgba(124,58,237,0.8), rgba(0,212,212,0.2))',
              'linear-gradient(315deg, rgba(0,212,212,0.8), rgba(124,58,237,0.2))',
              'linear-gradient(135deg, rgba(0,212,212,0.8), rgba(124,58,237,0.2))'
            ]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-20 h-20 rounded-full blur-[20px]"
          style={{ background: 'var(--foreground-subtle)' }}
          animate={{
            x: [-30, 30, -10, -30],
            y: [-30, -10, 30, -30],
            scale: [1, 1.2, 0.8, 1]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <Sparkles className="w-10 h-10 text-[var(--surface-text)] z-10 drop-shadow-[0_0_20px_var(--accent-primary)]" style={{ color: 'var(--foreground)' }} />
      </motion.div>
      <motion.h3
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.1 }}
        className="text-2xl font-black text-[var(--foreground)] tracking-tight mb-3"
      >
        Surface Level
      </motion.h3>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
        className="text-sm text-[var(--foreground-muted)] font-medium max-w-[280px] leading-relaxed mb-10"
      >
        Your deep dive begins here. Choose a persona to start mapping your English fluency.
      </motion.p>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.3 }}
        whileTap={{ scale: 0.94 }}
        onClick={onStart}
        className="w-full max-w-sm px-4 py-4 rounded-2xl text-[var(--background)] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-colors hover:bg-[var(--accent-primary-hover)] focus:outline-none"
        style={{ 
          background: 'var(--foreground)',
          boxShadow: 'var(--shadow-glow-cyan)' 
        }}
      >
        <MessageSquare className="w-4 h-4" />
        Break the Ice
      </motion.button>
    </div>
  );
}
