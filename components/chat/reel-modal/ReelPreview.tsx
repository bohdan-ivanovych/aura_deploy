import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/contexts/theme-context';
import { REEL_TYPES } from './constants';
import { ReelType, ReelMessage } from '@/hooks/useReelGenerator';

interface Props {
  selectedType: ReelType;
  messages: ReelMessage[];
  persona: { name: string };
  SPRING: any;
  onGenerate: () => void;
}

export function ReelPreview({ selectedType, messages, persona, SPRING, onGenerate }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const typeDef = REEL_TYPES.find(t => t.id === selectedType);

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={SPRING}
      className="px-4 pb-6 flex flex-col gap-4"
    >
      <div className="rounded-3xl overflow-hidden relative"
        style={{
          background: '#09090e',
          border: '1px solid rgba(0,212,212,0.15)',
          aspectRatio: '9/16',
          maxHeight: 320,
        }}
      >
        <div className="absolute inset-0 flex flex-col">
          <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <span className="text-[9px] font-black text-[#00d4d4]">AURA OS</span>
            <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{persona.name}</span>
          </div>
          <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
            {messages.slice(0, 3).map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] px-2.5 py-1.5 rounded-xl text-[8px] leading-relaxed"
                  style={{
                    background: m.sender === 'USER' ? 'rgba(0,212,212,0.2)' : 'rgba(255,255,255,0.07)',
                    border: m.sender === 'USER' ? '1px solid rgba(0,212,212,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                >
                  {m.text.slice(0, 50)}{m.text.length > 50 ? '…' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-8 left-0 right-0 flex justify-center">
            <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider"
              style={{ background: 'rgba(0,212,212,0.15)', border: '1px solid rgba(0,212,212,0.25)', color: '#00d4d4' }}>
              {typeDef?.emoji} {typeDef?.name}
            </span>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.25)' }}>AURA · auraapp.com</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` }}>
        <div className="flex items-center gap-2 mb-1">
          <span>{typeDef?.emoji}</span>
          <span className="text-sm font-black" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>{typeDef?.name}</span>
        </div>
        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
          {typeDef?.description}
        </p>
        <p className="text-[10px] mt-2 font-semibold italic" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
          ~8 seconds to generate
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        onClick={onGenerate}
        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.14em]"
        style={{
          background: 'linear-gradient(135deg, #00d4d4 0%, #0098db 100%)',
          color: '#000',
          boxShadow: '0 8px 28px rgba(0,212,212,0.4)',
        }}
      >
        Tap Generate to create the video ▼
      </motion.button>
    </motion.div>
  );
}
