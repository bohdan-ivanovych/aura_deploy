'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Star } from 'lucide-react';
import { deleteFlashcard, toggleStar } from '@/app/actions/flashcard';
import { toast } from 'sonner';
import { useTheme } from '@/lib/contexts/theme-context';
import { useState } from 'react';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

export default function FlashcardItem({ card, userId, index, onEdit, onStarToggle, onDelete }: any) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarred, setIsStarred] = useState(card.isStarred);

  const handleDelete = async (e: any) => {
    e.stopPropagation();
    try {
      setIsDeleting(true);
      await deleteFlashcard(card.id, userId);
      onDelete?.(card.id); // Optimistic removal from parent list
      toast.success('Deleted');
    } catch {
      setIsDeleting(false);
      toast.error('Failed to delete');
    }
  };

  const handleStar = async (e: any) => {
    e.stopPropagation();
    // Optimistic update
    const newStarred = !isStarred;
    setIsStarred(newStarred);
    try {
      await toggleStar(card.id, userId);
      onStarToggle?.(card.id, newStarred);
    } catch {
      // Revert on error
      setIsStarred(!newStarred);
      toast.error('Failed to star');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.05, 0.3) }}
      onClick={() => setIsRevealed(!isRevealed)}
      className="group relative rounded-3xl p-5 cursor-pointer overflow-hidden transition-all hover:bg-white/5 active:scale-[0.98]"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
            {card.front}
          </h3>
          <AnimatePresence>
             {isRevealed && (
               <motion.div
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="mt-3 pt-3 border-t border-[var(--border)]"
               >
                 <p className="text-[#00e676] font-bold text-lg mb-1">{card.back}</p>
                 {card.englishExplanation && (
                   <p className="text-sm font-medium text-[var(--foreground-muted)]">{card.englishExplanation}</p>
                 )}
               </motion.div>
             )}
          </AnimatePresence>
          {!isRevealed && (
            <p className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] mt-2 italic tracking-wider">
              Tap to see translation
            </p>
          )}
        </div>

        <div className="flex gap-1.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <motion.button
            type="button"
            onClick={handleStar}
            whileTap={{ scale: 0.88 }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: isStarred ? 'rgba(245,158,11,0.1)' : 'transparent',
              border: `1px solid ${isStarred ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
              color: isStarred ? '#f59e0b' : 'var(--foreground-muted)',
            }}
          >
            <Star className="w-4 h-4" fill={isStarred ? "currentColor" : "none"} />
          </motion.button>
          
          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(card); }}
            whileTap={{ scale: 0.88 }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors border border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--border)]"
          >
            <Pencil className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            type="button"
            onClick={handleDelete}
            whileTap={{ scale: 0.88 }}
            disabled={isDeleting}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors border border-[var(--border)] text-[var(--destructive)] hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
