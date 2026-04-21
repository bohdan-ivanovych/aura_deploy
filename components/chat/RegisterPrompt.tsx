'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface RegisterPromptProps {
  open: boolean;
  onDismiss: () => void;
}

export function RegisterPrompt({ open, onDismiss }: RegisterPromptProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
            onClick={onDismiss}
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[9991] flex flex-col items-center pb-safe-or-8 pt-3 px-4"
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mb-4" />

            <div
              className="w-full max-w-sm rounded-[32px] overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #0a0a12 0%, #0d1520 60%, #08080f 100%)',
                border: '1px solid rgba(0,212,212,0.2)',
                boxShadow: '0 0 80px rgba(0,212,212,0.1), 0 40px 80px rgba(0,0,0,0.8)',
              }}
            >
              <div className="relative p-6 flex flex-col items-center gap-4">
                <button
                  onClick={onDismiss}
                  className="absolute top-4 right-4 w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,212,0.2), rgba(0,152,219,0.15))',
                    border: '1px solid rgba(0,212,212,0.3)',
                  }}
                >
                  <Sparkles className="w-7 h-7" style={{ color: '#00d4d4' }} />
                </div>

                <div className="text-center space-y-1.5">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    You noticed the mistake
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Save your progress, track your corrections, and dive deeper — free.
                  </p>
                </div>

                <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />

                <div className="w-full flex flex-col gap-2.5">
                  <Link
                    href="/settings"
                    onClick={onDismiss}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-center text-black transition-all active:scale-[0.97]"
                    style={{
                      background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                      boxShadow: '0 8px 24px rgba(0,212,212,0.25)',
                    }}
                  >
                    Create Account
                  </Link>
                  <button
                    onClick={onDismiss}
                    className="w-full py-2.5 text-sm font-bold rounded-2xl transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Continue as guest
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
