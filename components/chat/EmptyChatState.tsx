'use client';

import { motion } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';

export function EmptyChatState({ onStart }: { onStart: () => void }) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center z-10 relative">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative mb-8"
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 40px rgba(0,212,212,0.1), inset 0 0 20px rgba(0,212,212,0.05)',
              '0 0 80px rgba(124,58,237,0.2), inset 0 0 40px rgba(124,58,237,0.1)',
              '0 0 40px rgba(0,212,212,0.1), inset 0 0 20px rgba(0,212,212,0.05)',
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 rounded-[32px] flex items-center justify-center liquid-glass-strong relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 opacity-40 mix-blend-overlay"
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundImage: 'radial-gradient(circle at center, rgba(0,212,212,0.8) 0%, transparent 70%)', backgroundSize: '200% 200%' }}
          />
          <Sparkles className="w-10 h-10 glow-cyan relative z-10" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.1 }}
      >
        <span className="micro-copy mb-3 block glow-cyan">AI Persona Engine</span>
        <h3 className="brutal-heading text-3xl mb-4 leading-tight">
           Surface <br/><span className="text-[var(--foreground-muted)]">Level</span>
        </h3>
      </motion.div>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
        className="text-sm text-[var(--foreground-muted)] font-medium max-w-[280px] leading-relaxed mb-10"
      >
        Your deep dive begins here. Choose a persona to start your immersive English session.
      </motion.p>
      
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.3 }}
        onClick={() => {
           if (typeof window !== 'undefined' && window.navigator.vibrate) {
             window.navigator.vibrate(20);
           }
           onStart();
        }}
        className="dopamine-button w-full max-w-sm px-6 py-4 rounded-2xl flex items-center justify-center gap-3 bg-[var(--foreground)] text-[var(--background)] shadow-[var(--shadow-glow-cyan)] hover:scale-[1.02] active:scale-95 transition-all"
      >
        <MessageSquare className="w-5 h-5 fill-current opacity-80" />
        <span className="text-xs font-black uppercase tracking-[0.2em] pt-0.5">Initialize Link</span>
      </motion.button>
    </div>
  );
}
