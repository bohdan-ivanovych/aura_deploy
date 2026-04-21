'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallbackLabel?: string }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallbackLabel?: string }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? 'Unknown error';
      const label = this.props.fallbackLabel ?? 'SYSTEM';
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: '#000812' }}
        >
          <div
            className="max-w-md w-full rounded-3xl p-8 space-y-6 relative overflow-hidden"
            style={{
              background: 'rgba(0,6,20,0.95)',
              border: '1px solid rgba(0,212,212,0.35)',
              boxShadow: '0 0 60px rgba(0,212,212,0.12), inset 0 1px 0 rgba(0,212,212,0.08)',
            }}
          >
            {/* Scan-line overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(0,212,212,1) 0px, transparent 1px, transparent 5px)',
              }}
            />

            {/* Header */}
            <div className="relative space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#00d4d4', boxShadow: '0 0 8px #00d4d4' }}
                />
                <p
                  className="text-[9px] font-black uppercase tracking-[0.45em]"
                  style={{ color: 'rgba(0,212,212,0.6)' }}
                >
                  {label} · Error Code 0xDEAD
                </p>
              </div>
              <h1
                className="text-2xl font-black tracking-tight"
                style={{
                  color: '#00d4d4',
                  textShadow: '0 0 20px rgba(0,212,212,0.5)',
                }}
              >
                System Glitch
              </h1>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,212,212,0.15)' }} />

            {/* Error detail */}
            <div
              className="rounded-xl px-4 py-3 font-mono text-[11px] leading-relaxed"
              style={{
                background: 'rgba(0,212,212,0.05)',
                border: '1px solid rgba(0,212,212,0.12)',
                color: 'rgba(255,255,255,0.45)',
                wordBreak: 'break-all',
              }}
            >
              {msg}
            </div>

            {/* Reboot button */}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all"
              style={{
                background: 'rgba(0,212,212,0.12)',
                border: '1px solid rgba(0,212,212,0.4)',
                color: '#00d4d4',
                boxShadow: '0 0 20px rgba(0,212,212,0.1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,212,0.22)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 30px rgba(0,212,212,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,212,0.12)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 20px rgba(0,212,212,0.1)';
              }}
            >
              ⟳ Reboot
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
