'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

const WL = 450;

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// 1. Органічні стрічки сяйва (Використовуємо RGB для плавного згасання в прозорість без "сірих країв")
const AURORA = [
  { rgb: '16, 185, 129', op: 0.8, dur: 14, delay: 0, left: 0, top: -10, w: 140, h: 60, blur: 80, rx: 10, ry: -5, rot: -5 },   // Неоновий зелений
  { rgb: '6, 182, 212', op: 0.9, dur: 18, delay: -4, left: 20, top: 5, w: 130, h: 70, blur: 90, rx: -15, ry: 10, rot: 8 },   // Ціан / Тіл
  { rgb: '139, 92, 246', op: 0.7, dur: 22, delay: -8, left: 15, top: -20, w: 110, h: 80, blur: 100, rx: 12, ry: 15, rot: -10 }, // Глибокий фіолетовий
  { rgb: '236, 72, 153', op: 0.5, dur: 16, delay: -2, left: 50, top: 15, w: 120, h: 50, blur: 70, rx: -10, ry: -10, rot: 5 },  // Фуксія / Рожевий
  { rgb: '14, 165, 233', op: 0.7, dur: 25, delay: -12, left: -20, top: 10, w: 160, h: 90, blur: 110, rx: 15, ry: 5, rot: -2 },   // Небесно-блакитна база
];

// 2. Генератор стилізованого зоряного неба
function Stars() {
  const stars = useMemo(() => {
    const rng = seededRng(12345); // Фіксований сід для гідратації без помилок
    return Array.from({ length: 180 }).map((_, i) => ({
      id: i,
      x: rng() * 100,
      y: rng() * 65, // Зірки переважно у верхній частині (небі)
      r: rng() * 1.3 + 0.2,
      opacity: rng() * 0.8 + 0.2,
      dur: rng() * 4 + 2,
      delay: rng() * 8
    }));
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {stars.map((s) => (
        <circle
          key={s.id} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#FFFFFF"
          style={{
            opacity: s.opacity,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite alternate`
          }}
        />
      ))}
    </svg>
  );
}

export function IcebergIllustration({ progress }: { progress: number }) {
  const [mounted, setMounted] = useState(false);

  const progressValue = useMotionValue(0);
  const smoothProgress = useSpring(progressValue, { damping: 25, stiffness: 80, mass: 0.5 });
  const depthText = useTransform(smoothProgress, (val) => `${(val * 15).toFixed(1)}m`);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { progressValue.set(progress); }, [progress, progressValue]);

  // Анімації для органічного переміщення та дихання сяйва
  const auroraCSS = AURORA.map((a, i) => `
    @keyframes aurora-anim-${i} {
      0%, 100% { 
        transform: translate3d(0, 0, 0) rotate(${a.rot}deg) scale(1); 
        opacity: ${a.op * 0.6}; 
        filter: blur(${a.blur}px) hue-rotate(0deg); 
      }
      33% { 
        transform: translate3d(${a.rx}%, ${a.ry}%, 0) rotate(${a.rot + 6}deg) scale(1.15); 
        opacity: ${a.op}; 
        filter: blur(${a.blur * 1.1}px) hue-rotate(15deg); 
      }
      66% { 
        transform: translate3d(${-a.rx}%, ${-a.ry}%, 0) rotate(${a.rot - 6}deg) scale(0.9); 
        opacity: ${a.op * 0.8}; 
        filter: blur(${a.blur * 0.9}px) hue-rotate(-10deg); 
      }
    }
  `).join('\n');

  const globalCSS = `
    ${auroraCSS}
    @keyframes iceberg-bob {
      0%,100% { transform:translate3d(0,0,0); }
      50%     { transform:translate3d(0,-6px,0); }
    }
    @keyframes shimmer-ltr { from{transform:translate3d(0,0,0)} to{transform:translate3d(1000px,0,0)} }
    @keyframes shimmer-rtl { from{transform:translate3d(0,0,0)} to{transform:translate3d(-1000px,0,0)} }
    @keyframes water-drift { from{transform:translate3d(0,0,0)} to{transform:translate3d(-1000px,0,0)} }
    @keyframes twinkle {
      0%   { opacity: 0.1; transform: scale(0.6); }
      100% { opacity: 1; transform: scale(1.4); filter: drop-shadow(0 0 3px rgba(255,255,255,0.8)); }
    }
  `;

  return (
    <div
      className="relative w-full h-full min-h-[350px] overflow-hidden flex flex-col bg-[#010314]"
    >
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      {/* ── Чорно-темносинє небо (Градієнт) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 0,
        background: 'linear-gradient(180deg, #010312 0%, #06112a 35%, #08264a 100%)',
      }} />

      {/* ── Зірки ── */}
      {mounted && <Stars />}

      {/* ── Органічне сяйво (Aurora) ── */}
      {mounted && AURORA.map((a, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            zIndex: 1,
            left: `${a.left}%`,
            top: `${a.top}%`,
            width: `${a.w}%`,
            height: `${a.h}%`,
            background: `radial-gradient(ellipse at 50% 50%, rgba(${a.rgb}, 1) 0%, rgba(${a.rgb}, 0) 60%)`,
            mixBlendMode: 'screen', // Найкращий блендинг для світла на темному тлі
            willChange: 'transform, opacity, filter',
            animation: `aurora-anim-${i} ${a.dur}s ease-in-out ${a.delay}s infinite`,
            borderRadius: '100%',
          }}
        />
      ))}

      <svg
        width="100%" height="100%"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 2 }}
      >
        <defs>
          {/* Градієнти адаптовані під нічне освітлення */}
          <linearGradient id="iceCenter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="30%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0B1120" />
          </linearGradient>
          <linearGradient id="iceSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="oceanDeep" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#07203A" />
            <stop offset="40%" stopColor="#020815" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <linearGradient id="iceShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(165,243,252,0)" />
            <stop offset="50%" stopColor="rgba(165,243,252,0.15)" />
            <stop offset="100%" stopColor="rgba(165,243,252,0)" />
          </linearGradient>
          <linearGradient id="waterShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(56,189,248,0)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.2)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
          <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g style={{
          animation: 'iceberg-bob 8s ease-in-out infinite',
          willChange: 'transform',
          transformBox: 'fill-box',
          transformOrigin: 'center',
        }}>
          {/* Задні грані айсберга (темніші) */}
          <path d="M -100 700 L 250 280 L 450 700 Z" fill="url(#iceSide)" />
          <path d="M 250 280 L 450 700 L 250 700 Z" fill="#000000" opacity="0.6" />
          <path d="M 550 700 L 750 250 L 1100 700 Z" fill="url(#iceSide)" />
          <path d="M 750 250 L 1100 700 L 750 700 Z" fill="#000000" opacity="0.5" />

          {/* Центральна частина айсберга */}
          <path d="M 150 700 L 500 120 L 850 700 Z" fill="url(#iceCenter)" />
          <path d="M 500 120 L 850 700 L 500 700 Z" fill="#020617" opacity="0.6" />

          {/* Сяючий пік (відбиває сяйво) */}
          <path d="M 500 120 L 450 220 L 540 240 Z" fill="#7DD3FC" opacity="0.8" />

          {mounted && (
            <>
              <rect x="-1000" y="0" width="1000" height="700" fill="url(#iceShimmer)" opacity="0.8"
                style={{ willChange: 'transform', animation: 'shimmer-ltr 18s linear infinite' }} />
              <rect x="0" y="0" width="1000" height="700" fill="url(#iceShimmer)" opacity="0.8"
                style={{ willChange: 'transform', animation: 'shimmer-ltr 18s linear infinite' }} />
              <rect x="-1000" y="0" width="1000" height="700" fill="url(#iceShimmer)" opacity="0.5"
                style={{ willChange: 'transform', animation: 'shimmer-rtl 26s linear infinite' }} />
              <rect x="0" y="0" width="1000" height="700" fill="url(#iceShimmer)" opacity="0.5"
                style={{ willChange: 'transform', animation: 'shimmer-rtl 26s linear infinite' }} />
            </>
          )}
        </g>

        {/* Темний Океан */}
        <g transform={`translate(0, ${WL})`}>
          <rect x="-10%" y="0" width="120%" height="300" fill="url(#oceanDeep)" />
          {mounted && (
            <>
              <rect x="-1000" y="0" width="1000" height="300" fill="url(#waterShimmer)" opacity="0.9"
                style={{ willChange: 'transform', animation: 'water-drift 14s linear infinite' }} />
              <rect x="0" y="0" width="1000" height="300" fill="url(#waterShimmer)" opacity="0.9"
                style={{ willChange: 'transform', animation: 'water-drift 14s linear infinite' }} />
            </>
          )}
          {/* Лінія води з неоновим свіченням */}
          <line
            x1="-10%" y1="0" x2="110%" y2="0"
            stroke="rgba(56, 189, 248, 0.6)"
            strokeWidth="2"
            filter="url(#glowLine)"
          />
        </g>
      </svg>

      {/* Depth HUD */}
      <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8" style={{ zIndex: 20 }}>
        <div className="p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] md:bg-transparent md:border-0 md:backdrop-blur-none md:shadow-none md:p-0">
          <div className="flex justify-between items-end mb-3 md:mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-sky-200/50 uppercase mb-0.5 md:text-[9px] md:tracking-[0.22em] md:font-semibold md:text-sky-200/50">
                Current Depth
              </span>
              <motion.span className="text-xl font-medium text-white tracking-tight tabular-nums md:text-2xl md:font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {depthText}
              </motion.span>
            </div>
            <span className="text-sm font-medium text-sky-200/30 tabular-nums pb-0.5 md:text-[11px] md:font-bold md:text-sky-200/40">
              15.0m
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/60 shadow-inner relative md:h-[3px] md:bg-white/10">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(100, progress * 100)}%` }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              style={{
                background: 'linear-gradient(90deg, #10B981, #06B6D4, #8B5CF6)',
                boxShadow: '0 0 16px rgba(6,182,212,0.9)',
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)] md:hidden" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AbyssBackground({ depth }: { depth: number }) {
  const [mounted, setMounted] = useState(false);

  // Частинки в безодні тепер світяться неоновим синім/фіолетовим
  const particles = useMemo(() => {
    const count = Math.min(16, Math.max(8, 6 + depth * 2));
    const rng = seededRng(depth * 31 + 7);
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: rng() * 3.5 + 1.5,
      left: rng() * 100,
      duration: rng() * 12 + 8,
      delay: rng() * 8,
      isPurple: rng() > 0.7, // 30% частинок будуть мати фіолетовий відтінок
    }));
  }, [depth]);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#01020A]">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes abyss-particle {
          0%   { transform:translate3d(0,0,0);      opacity:0; }
          15%  {                                    opacity:0.8; }
          85%  {                                    opacity:0.8; }
          100% { transform:translate3d(0,-100vh,0); opacity:0; }
        }
      ` }} />
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full" style={{
          width: p.size, height: p.size,
          left: `${p.left}%`, bottom: '-5%',
          opacity: 0,
          background: p.isPurple ? '#A78BFA' : '#38BDF8',
          boxShadow: `0 0 ${p.size * 3}px ${p.isPurple ? 'rgba(167,139,250,0.8)' : 'rgba(56,189,248,0.8)'}`,
          animation: `abyss-particle ${p.duration}s linear ${p.delay}s infinite`,
          willChange: 'transform, opacity',
        }} />
      ))}
    </div>
  );
}