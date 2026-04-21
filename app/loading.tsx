export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-[9999]" style={{ background: 'var(--background)' }}>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes liquid-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes liquid-pulse {
          0%, 100% { transform: scale(0.98); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        @keyframes text-reveal {
          0% { opacity: 0; transform: translateY(8px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
        }
        .liquid-core {
          background: linear-gradient(135deg, rgba(0, 212, 212, 0.4), rgba(0, 152, 219, 0.1));
          box-shadow: inset 0 0 20px rgba(0, 212, 212, 0.5), 0 0 30px rgba(0, 212, 212, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>

      <div className="relative flex flex-col items-center gap-6">
        {/* Core Logo Wrapper */}
        <div className="relative w-24 h-24 flex items-center justify-center" style={{ animation: 'liquid-pulse 3s ease-in-out infinite' }}>
          
          {/* Animated Liquid Ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ animation: 'liquid-rotate 8s linear infinite' }}>
            <defs>
              <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4d4" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0098db" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path
              d="M50 2 C 76.5 2, 98 23.5, 98 50 C 98 76.5, 76.5 98, 50 98 C 23.5 98, 2 76.5, 2 50 C 2 23.5, 23.5 2, 50 2 Z"
              fill="none"
              stroke="url(#liquidGrad)"
              strokeWidth="1.5"
              strokeDasharray="90 180"
              strokeLinecap="round"
            />
          </svg>

          {/* Inner Glass Core */}
          <div className="relative w-16 h-16 rounded-[40%] liquid-core flex items-center justify-center overflow-hidden border border-[rgba(0,212,212,0.3)]" style={{ animation: 'liquid-rotate 12s linear infinite reverse' }}>
            <div className="absolute inset-0 w-full h-full" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmer-sweep 2.5s ease-in-out infinite',
            }} />
          </div>
          
          {/* Static Center Text / Logo Mark */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black tracking-tighter" style={{
              background: 'linear-gradient(135deg, #fff 0%, #00d4d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              A
            </span>
          </div>

        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1.5" style={{ animation: 'text-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          <p className="text-[14px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--foreground)' }}>
            Aura
          </p>
          <div className="h-0.5 w-8 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,212,0.1)' }}>
            <div className="h-full rounded-full bg-[var(--accent-cyan)]" style={{ width: '40%', animation: 'shimmer-sweep 2s ease-in-out infinite' }} />
          </div>
        </div>
      </div>

    </div>
  );
}
