'use client';

import { motion } from 'framer-motion';

/** Full-page shimmer skeleton shown while chat sessions are loading */
export function ChatListSkeleton() {
  return (
    <div 
      className="flex-1 overflow-hidden px-3 pt-3 space-y-2"
      role="status"
      aria-label="Завантаження списку чатів"
    >
      {[80, 65, 90, 55, 75].map((w, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
          className="w-full p-4 rounded-[24px] flex items-center gap-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10"
        >
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 rounded-full" style={{ width: `${w}%` }} />
            <div className="skeleton h-2.5 rounded-full" style={{ width: `${w * 0.7}%` }} />
          </div>
        </motion.div>
      ))}
      <span className="sr-only">Завантаження...</span>
    </div>
  );
}

/** Bubble-level skeleton shown while AI is typing */
export function ChatSkeleton() {
  // Варіанти для анімації стрибаючих крапок
  const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: { y: -4, opacity: 1 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex items-end gap-2 pr-16"
      role="status"
      aria-label="Штучний інтелект друкує..."
    >
      {/* Аватарка AI */}
      <div className="w-7 h-7 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center shrink-0 mb-1">
        <span className="text-[9px] font-bold text-[var(--foreground-muted)]">AI</span>
      </div>

      {/* Бульбашка з крапками */}
      <div className="px-5 py-4 rounded-[22px] rounded-tl-md bg-[var(--surface)] border border-[var(--border)] backdrop-blur-xl shadow-[var(--shadow-md)] flex items-center gap-1.5 min-h-[48px]">
        <motion.div
          variants={{ animate: { transition: { staggerChildren: 0.15 } } }}
          initial="initial"
          animate="animate"
          className="flex items-center gap-1.5 pt-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              variants={dotVariants}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] inline-block"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}