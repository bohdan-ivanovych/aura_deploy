/**
 * AuroraBackground — Enhanced ambient animated gradient blobs (desktop only).
 *
 * v2: Added a fourth "deep teal" blob + pulsing core glow for richer iceberg aurora.
 *     Keyframes in globals.css (aurora-drift-1/2/3/4).
 *     All animations respect prefers-reduced-motion via CSS.
 */
'use client';

import { useState, useEffect } from 'react';

export function AuroraBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block"
      style={{ zIndex: 0, contentVisibility: 'auto' }}
      aria-hidden="true"
    >
      {/* Blob 1 — Cyan, top-left — brighter & wider */}
      <div
        className="absolute w-[65vw] h-[65vh] rounded-[100%] opacity-50 blur-[100px]"
        style={{
          top: '-12%',
          left: '-8%',
          background: 'radial-gradient(circle, #00d4d4 0%, rgba(0,212,212,0.3) 40%, transparent 70%)',
          animation: 'aurora-drift-1 22s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />
      {/* Blob 2 — Purple, middle-right — richer violet */}
      <div
        className="absolute w-[70vw] h-[60vh] rounded-[100%] opacity-35 blur-[110px]"
        style={{
          top: '18%',
          right: '-12%',
          background: 'radial-gradient(circle, #7c3aed 0%, rgba(124,58,237,0.25) 45%, transparent 72%)',
          animation: 'aurora-drift-2 28s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />
      {/* Blob 3 — Blue, bottom — deeper */}
      <div
        className="absolute w-[80vw] h-[55vh] rounded-[100%] opacity-30 blur-[100px]"
        style={{
          bottom: '-12%',
          left: '8%',
          background: 'radial-gradient(circle, #2563eb 0%, rgba(37,99,235,0.2) 45%, transparent 70%)',
          animation: 'aurora-drift-3 24s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />
      {/* Blob 4 — Deep teal, center — pulsating core glow (NEW) */}
      <div
        className="absolute w-[50vw] h-[45vh] rounded-[100%] opacity-20 blur-[120px]"
        style={{
          top: '30%',
          left: '25%',
          background: 'radial-gradient(circle, #06b6d4 0%, rgba(6,182,212,0.15) 50%, transparent 75%)',
          animation: 'aurora-drift-4 18s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* Noise overlay — prevents banding artifacts in gradients */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          mixBlendMode: 'overlay',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noiseFilter\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.8\\" numOctaves=\\"3\\" stitchTiles=\\"stitch\\"%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noiseFilter)\\"/&gt;%3C/svg%3E")'
        }}
      />
    </div>
  );
}
