/**
 * LoadingScreen — Full-screen loading spinner.
 * 
 * WHY CSS-only: This component renders on the CRITICAL PATH (first paint).
 * Using framer-motion here would require the entire ~55KB library to be
 * loaded and parsed before any visual feedback appears. CSS animations
 * are parsed by the browser instantly — zero JS cost.
 * The visual output is identical to the framer-motion version.
 */
'use client';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div
        className="text-center space-y-6"
        style={{
          animation: 'scaleIn 0.5s ease-out both',
        }}
      >
        {/* Logo spinner — pure CSS rotation */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-quaternary))',
            boxShadow: '0 0 40px rgba(0,212,212,0.4)',
            animation: 'spin 2s linear infinite',
          }}
        >
          <span className="text-2xl font-black" style={{ color: 'var(--background)' }}>A</span>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h1
            className="text-xl font-black"
            style={{
              background: 'linear-gradient(135deg, var(--foreground) 0%, var(--foreground-muted) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AURA
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground-subtle)' }}>
            Initializing neural pathways...
          </p>
        </div>

        {/* Loading dots — CSS-only pulse */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--accent-cyan)',
                animation: `loading-dot 1.5s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* CSS keyframes — inlined here because this component must be self-contained
            for the critical render path. No external CSS dependency. */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes loading-dot {
            0%, 60%, 100% { transform: scale(1); opacity: 0.5; }
            30% { transform: scale(1.5); opacity: 1; }
          }
        `}} />
      </div>
    </div>
  );
}

export function ChatLoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar">
      <div className="max-w-2xl mx-auto w-full px-4 md:px-8 pb-32 space-y-4">
        {/* Header skeleton — explicit height prevents CLS */}
        <div className="h-16 rounded-2xl skeleton" />

        {/* Message skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full skeleton aspect-square shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded-lg skeleton w-3/4" />
              <div className="h-4 rounded-lg skeleton w-1/2" />
            </div>
          </div>
        ))}

        {/* Input skeleton — explicit height prevents CLS */}
        <div className="h-12 rounded-2xl skeleton mt-8" />
      </div>
    </div>
  );
}
