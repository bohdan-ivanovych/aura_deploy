import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/contexts/theme-context';
import { STAGE_LABELS } from './constants';
import { GenerationStage } from '@/hooks/useReelGenerator';

interface Props {
  genStage: GenerationStage;
  genProgress: number;
  SPRING: any;
}

export function ReelGenerating({ genStage, genProgress, SPRING }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const stages: GenerationStage[] = ['analyzing', 'composing', 'audio', 'encoding', 'ready'];
  const currentIdx = stages.indexOf(genStage);

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
      className="px-4 pb-8 pt-2 flex flex-col items-center gap-6"
    >
      <div className="relative w-full flex flex-col items-center gap-4">
        <div className="relative w-1 rounded-full overflow-hidden" style={{ height: 160, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <motion.div
            className="absolute top-0 left-0 right-0 rounded-full"
            style={{ background: 'linear-gradient(180deg, #00d4d4, #0098db)', boxShadow: '0 0 12px rgba(0,212,212,0.6)' }}
            animate={{ height: `${genProgress * 100}%` }}
            transition={{ duration: 0.4, ease: 'linear' }}
          />
        </div>

        <div className="text-center space-y-1">
          <motion.p
            key={genStage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-black"
            style={{ color: isDark ? '#fff' : '#1D1D1F' }}
          >
            {STAGE_LABELS[genStage]}
          </motion.p>
          <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
            ~8 seconds
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {stages.map((s, i) => {
          const isActive = i <= currentIdx;
          return (
            <motion.div key={s} animate={{ scale: i === currentIdx ? 1.4 : 1 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isActive ? '#00d4d4' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') }} />
          );
        })}
      </div>

      <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00d4d4, #0098db)' }}
          animate={{ width: `${genProgress * 100}%` }} transition={{ duration: 0.4, ease: 'linear' }} />
      </div>
    </motion.div>
  );
}
