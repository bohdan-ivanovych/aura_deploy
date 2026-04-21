'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/contexts/theme-context';

export interface RadarSkill {
  label: string;
  value: number;
}

const AXIS_COLORS = {
  Grammar:    { main: '#00ff88', glow: 'rgba(0,255,136,0.7)' },
  Vocabulary: { main: '#fbbf24', glow: 'rgba(251,191,36,0.7)' },
  Nativeness: { main: '#a78bfa', glow: 'rgba(167,139,250,0.7)' },
  Complexity: { main: '#f43f5e', glow: 'rgba(244,63,94,0.7)'  },
  Initiative: { main: '#38bdf8', glow: 'rgba(56,189,248,0.7)' },
} as const;

const AXIS_COLORS_LIGHT = {
  Grammar:    '#00a060',
  Vocabulary: '#d97706',
  Nativeness: '#7c3aed',
  Complexity: '#e11d48',
  Initiative: '#0284c7',
} as const;

const MOBILE_LABELS: Record<string, string> = {
  Grammar:    'GRAM.',
  Vocabulary: 'VOCAB',
  Nativeness: 'NATV.',
  Complexity: 'CMPLX',
  Initiative: 'INIT.',
};

interface PingEvent {
  id: number;
  idx: number;
}

function SkillRadarSVG({
  skills,
  size = 210,
  isMobile = false,
  isDark = true,
}: {
  skills: RadarSkill[];
  size?: number;
  isMobile?: boolean;
  isDark?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const n = skills.length;

  const prevValuesRef = useRef<number[]>([]);
  const pingCounterRef = useRef(0);
  const [pings, setPings] = useState<PingEvent[]>([]);

  const angleFor = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;

  useEffect(() => {
    const prev = prevValuesRef.current;
    if (prev.length === skills.length) {
      const newPings: PingEvent[] = [];
      skills.forEach((s, i) => {
        if (Math.abs(s.value - prev[i]) > 0.5) {
          newPings.push({ id: ++pingCounterRef.current, idx: i });
        }
      });
      if (newPings.length > 0) {
        setPings((p) => [...p, ...newPings]);
        setTimeout(() => {
          const ids = new Set(newPings.map((e) => e.id));
          setPings((p) => p.filter((e) => !ids.has(e.id)));
        }, 1400);
      }
    }
    prevValuesRef.current = skills.map((s) => s.value);
  }, [skills]);

  const ringPoints = (r: number) =>
    skills.map((_, i) => {
      const a = angleFor(i);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
    });

  const dataPoints = skills.map((s, i) => {
    const r = (s.value / 100) * maxR;
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  });

  const spokeEnds = skills.map((_, i) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR] as [number, number];
  });

  const polyPath =
    dataPoints.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ') + ' Z';

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const gridStrokeOuter = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const gridStrokeInner = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const spokeStroke = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const valueFill = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,255,136,0.15)" />
          <stop offset="50%" stopColor="rgba(56,189,248,0.10)" />
          <stop offset="100%" stopColor="rgba(167,139,250,0.12)" />
        </linearGradient>
      </defs>

      {gridLevels.map((lv) => {
        const gp = ringPoints(maxR * lv);
        const d = gp.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ') + ' Z';
        return (
          <path
            key={lv}
            d={d}
            fill="none"
            stroke={lv === 1 ? gridStrokeOuter : gridStrokeInner}
            strokeWidth={lv === 1 ? '0.8' : '0.5'}
          />
        );
      })}

      {spokeEnds.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={spokeStroke} strokeWidth="0.7" />
      ))}

      <path d={polyPath} fill="url(#radarFill)" />
      <path
        d={polyPath}
        fill="none"
        stroke={isDark ? 'rgba(0,255,136,0.75)' : 'rgba(0,150,100,0.65)'}
        strokeWidth="1.5"
        filter={isDark ? 'url(#radarGlow)' : undefined}
        strokeLinejoin="round"
      />
      <path
        d={polyPath}
        fill="none"
        stroke={isDark ? 'rgba(0,255,136,0.2)' : 'rgba(0,150,100,0.1)'}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {spokeEnds.map(([x, y], i) => {
        const key = skills[i].label as keyof typeof AXIS_COLORS;
        const col = isDark ? (AXIS_COLORS[key]?.main ?? '#00ff88') : (AXIS_COLORS_LIGHT[key as keyof typeof AXIS_COLORS_LIGHT] ?? '#00a060');
        return (
          <motion.g
            key={`spoke-${i}`}
            style={{ transformOrigin: `${x}px ${y}px` }}
            animate={{ scale: [1, 1.55, 1], opacity: [0.55, 1, 0.55] }}
            transition={{
              duration: 2.2 + i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.22,
              repeatType: 'loop',
            }}
          >
            <circle
              cx={x}
              cy={y}
              r={3}
              fill={col}
              style={isDark ? { filter: `drop-shadow(0 0 5px ${col})` } : { opacity: 0.75 }}
            />
          </motion.g>
        );
      })}

      {dataPoints.map(([x, y], i) => {
        const key = skills[i].label as keyof typeof AXIS_COLORS;
        const col = isDark ? (AXIS_COLORS[key]?.main ?? '#00ff88') : (AXIS_COLORS_LIGHT[key as keyof typeof AXIS_COLORS_LIGHT] ?? '#00a060');
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill={col} opacity="0.2" />
            <circle cx={x} cy={y} r="2.2" fill={col} style={isDark ? { filter: `drop-shadow(0 0 4px ${col})` } : { opacity: 0.9 }} />
          </g>
        );
      })}

      <AnimatePresence>
        {pings.map((ping) => {
          const [x, y] = spokeEnds[ping.idx];
          const key2 = skills[ping.idx].label as keyof typeof AXIS_COLORS;
          const col = isDark ? (AXIS_COLORS[key2]?.main ?? '#00ff88') : (AXIS_COLORS_LIGHT[key2 as keyof typeof AXIS_COLORS_LIGHT] ?? '#00a060');
          return (
            <motion.circle
              key={ping.id}
              cx={x}
              cy={y}
              r={4}
              fill="none"
              stroke={col}
              strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 3px ${col})` }}
              initial={{ r: 4, opacity: 0.9 }}
              animate={{ r: 28, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          );
        })}
      </AnimatePresence>

      {spokeEnds.map(([x, y], i) => {
        const key = skills[i].label as keyof typeof AXIS_COLORS;
        const col = isDark ? (AXIS_COLORS[key]?.main ?? '#00ff88') : (AXIS_COLORS_LIGHT[key as keyof typeof AXIS_COLORS_LIGHT] ?? '#00a060');
        const a = angleFor(i);
        const lx = cx + Math.cos(a) * (maxR * 1.32);
        const ly = cy + Math.sin(a) * (maxR * 1.32);
        const label = isMobile ? (MOBILE_LABELS[skills[i].label] ?? skills[i].label.toUpperCase()) : skills[i].label.toUpperCase();
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isMobile ? '6.5' : '7'}
            fontWeight="700"
            letterSpacing="0.06em"
            fill={col}
            fontFamily="'Sora', system-ui, sans-serif"
            style={isDark ? { filter: `drop-shadow(0 0 3px ${col})` } : undefined}
          >
            {label}
          </text>
        );
      })}

      {dataPoints.map(([x, y], i) => {
        const val = skills[i].value;
        if (val < 10) return null;
        return (
          <text
            key={`v-${i}`}
            x={x}
            y={y - 6}
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="700"
            fill={valueFill}
            fontFamily="monospace"
          >
            {Math.round(val)}
          </text>
        );
      })}
    </svg>
  );
}

export function SkillRadarHUD({
  skills,
  containerRef,
}: {
  skills: RadarSkill[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [screenW, setScreenW] = useState(0);

  useEffect(() => {
    const check = () => setScreenW(window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isTiny   = screenW > 0 && screenW < 380;   // very small phones
  const isMobile = screenW > 0 && screenW < 768;

  // Scale down aggressively on small screens
  const containerW = isTiny ? 148 : isMobile ? 168 : 236;
  const svgSize    = isTiny ? 118 : isMobile ? 138 : 210;

  const containerBg     = isDark ? 'rgba(0,6,18,0.88)' : 'rgba(255,255,255,0.94)';
  const containerBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const headerBorder    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const footerBorder    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const dotColor        = isDark ? '#00ff88' : '#00cc70';
  const labelColor      = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const subLabelColor   = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)';
  const trackBg         = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';

  // On mobile sit just above the nav bar (bottom nav ~56px + 4px gap)
  // On desktop sit 6px from bottom
  const bottomOffset = isMobile ? '68px' : '24px';

  return (
    <motion.div
      ref={containerRef}
      className="absolute left-3 z-20 rounded-2xl"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 22 }}
      style={{
        width: containerW,
        bottom: bottomOffset,
        background: containerBg,
        border: `1px solid ${containerBorder}`,
        backdropFilter: 'blur(28px)',
        boxShadow: isDark
          ? '0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
        overflow: 'visible',
      }}
    >
      <div
        className="flex items-center justify-between rounded-t-2xl overflow-hidden"
        style={{
          padding: isMobile ? '5px 8px 4px' : '10px 14px 8px',
          borderBottom: `1px solid ${headerBorder}`,
          background: containerBg,
        }}
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span
            className="font-black uppercase"
            style={{
              fontSize: isMobile ? '6.5px' : '8px',
              letterSpacing: '0.28em',
              color: labelColor,
            }}
          >
            Skill Radar
          </span>
        </div>
        <span className="font-bold uppercase tracking-wider" style={{ fontSize: '6px', color: subLabelColor }}>
          5-Axis
        </span>
      </div>

      <div className="flex justify-center" style={{ padding: isMobile ? '4px 0' : '10px 0', overflow: 'visible' }}>
        <SkillRadarSVG skills={skills} size={svgSize} isMobile={isMobile} isDark={isDark} />
      </div>

      <div
        className="grid grid-cols-5 rounded-b-2xl overflow-hidden"
        style={{
          padding: isMobile ? '3px 6px 6px' : '6px 14px 12px',
          gap: isMobile ? 2 : 4,
          borderTop: `1px solid ${footerBorder}`,
          background: containerBg,
        }}
      >
        {skills.map((s) => {
          const key = s.label as keyof typeof AXIS_COLORS;
          const col = isDark ? (AXIS_COLORS[key]?.main ?? '#00ff88') : (AXIS_COLORS_LIGHT[key as keyof typeof AXIS_COLORS_LIGHT] ?? '#00a060');
          return (
            <div key={s.label} className="flex flex-col items-center gap-0.5 pt-1">
              <motion.span
                className="font-black"
                style={{ fontSize: isTiny ? '7px' : isMobile ? '7.5px' : '9px', color: col }}
                animate={isDark ? { textShadow: [`0 0 4px ${col}`, `0 0 10px ${col}`, `0 0 4px ${col}`] } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {Math.round(s.value)}
              </motion.span>
              <div className="w-full h-0.5 rounded-full" style={{ background: trackBg }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${s.value}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: col, boxShadow: isDark ? `0 0 4px ${col}` : undefined }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
