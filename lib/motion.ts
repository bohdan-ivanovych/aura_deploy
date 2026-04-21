import { useReducedMotion } from 'framer-motion';

export const SPRING = {
  SNAP:   { type: 'spring' as const, stiffness: 450, damping: 32 },
  SMOOTH: { type: 'spring' as const, stiffness: 350, damping: 30 },
  BOUNCY: { type: 'spring' as const, stiffness: 400, damping: 25, mass: 1 },
  HEAVY:  { type: 'spring' as const, stiffness: 280, damping: 28, mass: 1.2 },
  SOFT:   { type: 'spring' as const, stiffness: 380, damping: 30 },
};

export const STAGGER = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  },
  item: {
    hidden: { opacity: 0, y: 18 },
    show:   { opacity: 1, y: 0, transition: SPRING.SOFT },
  },
  itemX: {
    hidden: { opacity: 0, x: -12 },
    show:   { opacity: 1, x: 0, transition: SPRING.SOFT },
  },
};

export function useMotion() {
  const prefersReduced = useReducedMotion();
  const spring = (preset: keyof typeof SPRING) =>
    prefersReduced ? { duration: 0.01 } : SPRING[preset];
  const stagger = prefersReduced
    ? { staggerChildren: 0, delayChildren: 0 }
    : { staggerChildren: 0.06, delayChildren: 0.1 };
  return { prefersReduced, spring, stagger };
}

export const EASE_OUT_MOTION = { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const };
