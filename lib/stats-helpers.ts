export interface TopicNode {
  id: string;
  label: string;
  proficiency: number;
  count: number;
}

const TOPIC_SEEDS = [
  { label: 'Present Perfect', proficiency: 82 },
  { label: 'Articles', proficiency: 41 },
  { label: 'Prepositions', proficiency: 55 },
  { label: 'Conditionals', proficiency: 29 },
  { label: 'Passive Voice', proficiency: 73 },
  { label: 'Modal Verbs', proficiency: 88 },
  { label: 'Word Order', proficiency: 47 },
  { label: 'Phrasal Verbs', proficiency: 62 },
  { label: 'Vocabulary Range', proficiency: 90 },
  { label: 'Tense Consistency', proficiency: 38 },
];

export function buildNodes(
  topWeaknesses: Array<{ rule: string; count: number }> | undefined,
): TopicNode[] {
  if (topWeaknesses && topWeaknesses.length > 0) {
    return topWeaknesses
      .filter(w => w.rule && w.rule.trim() !== '' && w.rule.toLowerCase() !== 'none' && !w.rule.startsWith('strength:'))
      .map((w, i) => ({
      id: `node-${i}`,
      label: w.rule,
      count: w.count,
      proficiency: Math.max(0, Math.min(100, 100 - w.count * 8)),
    }));
  }
  return TOPIC_SEEDS.map((s, i) => ({
    id: `node-${i}`,
    label: s.label,
    count: 0,
    proficiency: s.proficiency,
  }));
}

export function getNodeStyle(proficiency: number) {
  if (proficiency >= 80) {
    return {
      color: '#00d4d4',
      glow: 'rgba(0,212,212,0.55)',
      borderColor: 'rgba(0,212,212,0.4)',
      bg: 'rgba(0,14,26,0.65)',
      pulse: false,
    };
  }
  if (proficiency >= 50) {
    return {
      color: '#f59e0b',
      glow: 'rgba(245,158,11,0.45)',
      borderColor: 'rgba(245,158,11,0.32)',
      bg: 'rgba(14,9,0,0.65)',
      pulse: false,
    };
  }
  return {
    color: '#f000b8',
    glow: 'rgba(240,0,184,0.62)',
    borderColor: 'rgba(240,0,184,0.38)',
    bg: 'rgba(18,0,14,0.65)',
    pulse: true,
  };
}

export function bubbleR(label: string): number {
  const words = label.split(' ');
  const effectiveLen = words.length > 1
    ? Math.max(...words.map(w => w.length))
    : label.length;
  if (effectiveLen <= 7)  return 44;
  if (effectiveLen <= 11) return 52;
  if (effectiveLen <= 16) return 60;
  return 68;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

export function blendHex(c1: string, c2: string): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex((r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2);
}

export function wrapLabel(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width <= maxW) { cur = test; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function resolveCircleRect(
  b: { x: number; y: number; vx: number; vy: number; r: number },
  rx: number, ry: number, rw: number, rh: number, pad = 10,
) {
  const x1 = rx - pad, y1 = ry - pad, x2 = rx + rw + pad, y2 = ry + rh + pad;
  const nearX = Math.max(x1, Math.min(b.x, x2));
  const nearY = Math.max(y1, Math.min(b.y, y2));
  const dx = b.x - nearX, dy = b.y - nearY;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < b.r) {
    const ov = b.r - dist;
    const nx = dx / dist, ny = dy / dist;
    b.x += nx * (ov + 1); b.y += ny * (ov + 1);
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) { b.vx -= 1.85 * dot * nx; b.vy -= 1.85 * dot * ny; }
  }
}
