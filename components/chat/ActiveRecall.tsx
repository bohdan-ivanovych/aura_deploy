'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Loader2 } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import { haptics } from '@/lib/utils/haptics';
import { promoteAIMessageToFlashcard } from '@/app/actions/learning-list';

interface ActiveRecallProps {
  messageId: string;
  grammarCorrection: string;
  weaknessRule: string | null;
}

export const ActiveRecall = memo(function ActiveRecall({
  messageId,
}: ActiveRecallProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [status, setStatus] = useState<'idle' | 'loading' | 'added'>('idle');

  const handleAdd = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    haptics.light();
    try {
      await promoteAIMessageToFlashcard(messageId);
      setStatus('added');
      haptics.success();
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <div className="mt-2 flex items-center justify-end">
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.button
            key="add"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95 border"
            style={{
              background: isDark ? 'rgba(0, 212, 212, 0.1)' : 'rgba(0, 212, 212, 0.05)',
              borderColor: isDark ? 'rgba(0, 212, 212, 0.3)' : 'rgba(0, 212, 212, 0.2)',
              color: 'var(--accent-cyan)',
            }}
          >
            <Plus className="w-3 h-3" />
            Add to Mistakes Deck
          </motion.button>
        )}
        
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating...
          </motion.div>
        )}

        {status === 'added' && (
          <motion.div
            key="added"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              borderColor: 'rgba(34, 197, 94, 0.25)',
              color: '#10b981',
            }}
          >
            <Check className="w-3 h-3" />
            Added
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
