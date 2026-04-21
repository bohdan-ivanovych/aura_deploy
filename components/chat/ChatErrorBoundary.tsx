'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State { hasError: boolean; error: Error | null }

export class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChatErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="max-w-sm w-full rounded-3xl p-8 flex flex-col items-center gap-5 text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(248,113,113,0.25)',
            boxShadow: '0 0 60px rgba(248,113,113,0.08)',
          }}
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <AlertTriangle className="w-7 h-7" style={{ color: '#f87171' }} />
          </motion.div>

          <div>
            <h3 className="text-base font-black mb-1.5" style={{ color: 'var(--foreground)' }}>
              Something went wrong
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
              The chat crashed unexpectedly. Your conversation history is saved.
            </p>
          </div>

          {this.state.error?.message && (
            <code className="text-[10px] px-3 py-2 rounded-xl w-full text-left truncate"
              style={{
                background: 'rgba(248,113,113,0.06)',
                color: 'rgba(248,113,113,0.8)',
                border: '1px solid rgba(248,113,113,0.12)',
              }}>
              {this.state.error.message.slice(0, 80)}
            </code>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-black transition-all"
            style={{
              background: 'linear-gradient(135deg, #00d4d4, #0098db)',
              color: '#000',
              boxShadow: '0 6px 24px rgba(0,212,212,0.3)',
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reload
          </motion.button>
        </motion.div>
      </div>
    );
  }
}
