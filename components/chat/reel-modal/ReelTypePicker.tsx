import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import { REEL_TYPES, ReelTypeDef } from './constants';
import { ReelType } from '@/hooks/useReelGenerator';

interface Props {
  availableTypes: ReelTypeDef[];
  recommendedType: ReelType;
  onSelectType: (type: ReelType) => void;
  SPRING: any;
}

export function ReelTypePicker({ availableTypes, recommendedType, onSelectType, SPRING }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  return (
    <motion.div
      key="picker"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="pb-6"
    >
      <div className="flex flex-col gap-2.5 px-4 pt-2">
        {availableTypes.map((t, i) => {
          const isRecommended = t.id === recommendedType;
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: i * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectType(t.id)}
              className="relative flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
              style={{
                background: isRecommended
                  ? (isDark ? 'rgba(0,212,212,0.08)' : 'rgba(0,212,212,0.06)')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                border: isRecommended
                  ? '1px solid rgba(0,212,212,0.3)'
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                opacity: isRecommended ? 1 : 0.7,
              }}
            >
              {isRecommended && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em]"
                  style={{ background: '#00d4d4', color: '#000' }}>
                  Best for this session
                </div>
              )}
              <span className="text-2xl shrink-0">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>{t.name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  "{t.hook}"
                </p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
