import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTIONS = ['😂', '🔥', '💯', '🙄', '❤️', '🫡', '🤡', '🤨', '🤬', '💀'];

export function ReactionPill({ reaction, isAI }: { reaction: string | null; isAI: boolean }) {
  if (!reaction) return null;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`absolute -bottom-3 ${isAI ? 'left-2' : 'right-2'} flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[12px] z-10`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {reaction}
    </motion.div>
  );
}

interface ReactionPickerProps {
  show: boolean;
  isAI: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ show, isAI, onSelect, onClose }: ReactionPickerProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className={`absolute z-[56] flex items-center gap-1 px-2 py-1.5 rounded-full ${isAI ? 'left-0' : 'right-0'} -top-12`}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {REACTIONS.map(emoji => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.3 }}
                onClick={() => onSelect(emoji)}
                className="text-[20px] leading-none"
                style={{ lineHeight: 1 }}
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
