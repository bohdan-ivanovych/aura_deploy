'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import {
  TopicNode,
  getNodeStyle,
  bubbleR,
  blendHex,
  wrapLabel,
  resolveCircleRect,
} from '@/lib/stats-helpers';

interface PhysBubble {
  id: string; label: string; proficiency: number;
  x: number; y: number; vx: number; vy: number; r: number;
  hexColor: string; bgRgba: string;
}
interface Ripple { id: number; x: number; y: number; r: number; maxR: number; hex: string; alpha: number; }
interface Spark  { id: number; x: number; y: number; vx: number; vy: number; r: number; hex: string; life: number; }

export const BubblePhysicsLayer = memo(function BubblePhysicsLayer({
  seedNodes,
  onSelectNode,
  hudRefs,
}: {
  seedNodes: TopicNode[];
  onSelectNode: (node: TopicNode) => void;
  isMobile: boolean;
  hudRefs: React.RefObject<HTMLElement | null>[];
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const bubblesRef  = useRef<PhysBubble[]>([]);
  const ripplesRef  = useRef<Ripple[]>([]);
  const sparksRef   = useRef<Spark[]>([]);
  const nextId      = useRef(0);
  const rafRef      = useRef(0);
  const cooldowns   = useRef(new Map<string, number>());
  const hoveredRef  = useRef<string | null>(null);

  const initBubbles = useCallback((
    W: number, H: number,
    uiRects: { x: number; y: number; w: number; h: number }[],
  ) => {
    if (!seedNodes.length || W === 0 || H === 0) return;
    const NAV_BOTTOM = 90;
    const placed: PhysBubble[] = [];
    for (const node of seedNodes) {
      const r = bubbleR(node.label);
      const style = getNodeStyle(node.proficiency);
      let x = r + Math.random() * (W - 2 * r);
      let y = r + Math.random() * (H - NAV_BOTTOM - 2 * r);
      for (let attempt = 0; attempt < 600; attempt++) {
        const tx = r + 8 + Math.random() * (W - 2 * r - 16);
        const ty = r + 8 + Math.random() * (H - NAV_BOTTOM - 2 * r - 16);
        let ok = true;
        for (const b of placed) {
          if (Math.hypot(tx - b.x, ty - b.y) < r + b.r + 14) { ok = false; break; }
        }
        if (ok) {
          for (const rect of uiRects) {
            const nearX = Math.max(rect.x, Math.min(tx, rect.x + rect.w));
            const nearY = Math.max(rect.y, Math.min(ty, rect.y + rect.h));
            if (Math.hypot(tx - nearX, ty - nearY) < r + 16) { ok = false; break; }
          }
        }
        if (ok) { x = tx; y = ty; break; }
      }
      const speed = 0.35 + Math.random() * 0.55;
      const angle = Math.random() * Math.PI * 2;
      placed.push({
        id: node.id, label: node.label, proficiency: node.proficiency,
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r, hexColor: style.color, bgRgba: style.bg,
      });
    }
    bubblesRef.current = placed;
    ripplesRef.current = [];
    sparksRef.current  = [];
    cooldowns.current.clear();
  }, [seedNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    let lastW = 0, lastH = 0, lastDpr = 0;
    let initialized = false;

    const setupCtx = (): { ctx: CanvasRenderingContext2D; W: number; H: number } | null => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (!W || !H) return null;
      if (W !== lastW || H !== lastH || dpr !== lastDpr) {
        canvas.width  = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx = canvas.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastW = W; lastH = H; lastDpr = dpr;
        initialized = false;
      }
      return { ctx: ctx!, W, H };
    };

    const tick = (now: number) => {
      const setup = setupCtx();
      if (!setup) { rafRef.current = requestAnimationFrame(tick); return; }
      const { ctx, W, H } = setup;

      const canvasRect = canvas.getBoundingClientRect();
      const uiRects: { x: number; y: number; w: number; h: number }[] = [];
      for (const ref of hudRefs) {
        const el = ref.current;
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        uiRects.push({ x: r.left - canvasRect.left, y: r.top - canvasRect.top, w: r.width, h: r.height });
      }

      if (!initialized) { initBubbles(W, H, uiRects); initialized = true; }

      const bubbles = bubblesRef.current;
      const ripples = ripplesRef.current;
      const sparks  = sparksRef.current;

      for (const rip of ripples) {
        for (const b of bubbles) {
          const d = Math.hypot(b.x - rip.x, b.y - rip.y);
          if (Math.abs(d - rip.r) < 28 && d > 0) {
            const f = 0.012 * rip.alpha;
            b.vx += ((b.x - rip.x) / d) * f;
            b.vy += ((b.y - rip.y) / d) * f;
          }
        }
      }

      for (const b of bubbles) {
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 2.2) { b.vx = b.vx / spd * 2.2; b.vy = b.vy / spd * 2.2; }
        b.x += b.vx; b.y += b.vy;
        const M = 3;
        if (b.x - b.r < M)     { b.x = b.r + M;     b.vx =  Math.abs(b.vx); }
        if (b.x + b.r > W - M) { b.x = W - b.r - M; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < M)     { b.y = b.r + M;     b.vy =  Math.abs(b.vy); }
        if (b.y + b.r > H - M) { b.y = H - b.r - M; b.vy = -Math.abs(b.vy); }
        for (const rect of uiRects) resolveCircleRect(b, rect.x, rect.y, rect.w, rect.h);
      }

      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i], b = bubbles[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minD = a.r + b.r;
          if (dist < minD && dist > 0.01) {
            const ov = (minD - dist) / 2;
            const nx = dx / dist, ny = dy / dist;
            a.x -= nx * ov; a.y -= ny * ov;
            b.x += nx * ov; b.y += ny * ov;
            const dvx = b.vx - a.vx, dvy = b.vy - a.vy;
            const dot = dvx * nx + dvy * ny;
            if (dot < 0) {
              a.vx += dot * nx * 0.95; a.vy += dot * ny * 0.95;
              b.vx -= dot * nx * 0.95; b.vy -= dot * ny * 0.95;
            }
            const cd = cooldowns.current;
            const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
            if (!cd.has(key) || cd.get(key)! < now) {
              cd.set(key, now + 800);
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              ripplesRef.current.push({
                id: nextId.current++, x: mx, y: my, r: 0,
                maxR: Math.max(a.r, b.r) * 2.2,
                hex: blendHex(a.hexColor, b.hexColor),
                alpha: 0.55,
              });
              for (let k = 0; k < 6; k++) {
                const spkAngle = Math.random() * Math.PI * 2;
                const spkSpd = 1.5 + Math.random() * 2.5;
                sparksRef.current.push({
                  id: nextId.current++, x: mx, y: my,
                  vx: Math.cos(spkAngle) * spkSpd, vy: Math.sin(spkAngle) * spkSpd,
                  r: 1.5 + Math.random() * 2, hex: Math.random() > 0.5 ? a.hexColor : b.hexColor,
                  life: 1.0,
                });
              }
            }
          }
        }
      }

      for (const rip of ripplesRef.current) { rip.r += 2.8; rip.alpha -= 0.018; }
      ripplesRef.current = ripplesRef.current.filter(r => r.alpha > 0 && r.r < r.maxR);

      for (const sp of sparksRef.current) {
        sp.x += sp.vx; sp.y += sp.vy;
        sp.vx *= 0.94; sp.vy *= 0.94;
        sp.life -= 0.045;
      }
      sparksRef.current = sparksRef.current.filter(s => s.life > 0);

      ctx.clearRect(0, 0, W, H);

      for (const rip of ripplesRef.current) {
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = rip.hex + Math.round(rip.alpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      for (const sp of sparksRef.current) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * sp.life, 0, Math.PI * 2);
        ctx.fillStyle = sp.hex + Math.round(sp.life * 0.8 * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      const hov = hoveredRef.current;
      for (const b of bubbles) {
        const isHov = b.id === hov;
        const style = getNodeStyle(b.proficiency);

        ctx.save();
        if (isHov) {
          ctx.shadowColor = b.hexColor;
          ctx.shadowBlur = 24;
        }

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.bgRgba;
        ctx.fill();

        ctx.lineWidth = isHov ? 2 : 1.3;
        ctx.strokeStyle = style.borderColor;
        ctx.stroke();
        ctx.restore();

        if (style.pulse) {
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.003 + b.x);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 3 + pulse * 4, 0, Math.PI * 2);
          ctx.strokeStyle = b.hexColor + '28';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.save();
        ctx.fillStyle = b.hexColor;
        ctx.font = `bold ${b.r < 48 ? 9 : 10}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = wrapLabel(ctx, b.label, b.r * 1.55);
        const lineH = b.r < 48 ? 12 : 13;
        const totalH = lines.length * lineH;
        lines.forEach((line, li) => {
          ctx.fillText(line, b.x, b.y - totalH / 2 + li * lineH + lineH / 2);
        });
        ctx.restore();

        const pctText = `${b.proficiency}%`;
        ctx.save();
        ctx.fillStyle = b.hexColor + '99';
        ctx.font = `bold 8px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pctText, b.x, b.y + b.r * 0.65);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [initBubbles, hudRefs]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    for (const b of bubblesRef.current) {
      if (Math.hypot(x - b.x, y - b.y) <= b.r) {
        const node = seedNodes.find(n => n.id === b.id);
        if (node) onSelectNode(node);
        break;
      }
    }
  }, [seedNodes, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let found: string | null = null;
    for (const b of bubblesRef.current) { if (Math.hypot(x - b.x, y - b.y) <= b.r) { found = b.id; break; } }
    hoveredRef.current = found;
    canvas.style.cursor = found ? 'pointer' : 'default';
  }, []);

  return (
    <div className="absolute inset-0" style={{ zIndex: 30 }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
});
