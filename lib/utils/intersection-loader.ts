'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseInViewportOptions {
  /** Intersection threshold (0–1). Default: 0 (any pixel visible triggers) */
  threshold?: number;
  /** Root margin — triggers loading before element enters viewport.
   * WHY: 200px margin means we start loading components BEFORE the user scrolls
   * to them, making the experience feel instantaneous. */
  rootMargin?: string;
  /** Only trigger once (then disconnect observer). Default: true */
  once?: boolean;
}

/**
 * Hook: detect when an element enters the viewport.
 * 
 * WHY: Used to defer rendering of below-fold components (WeaknessHeatmap,
 * SkillTreeGrid, CrewCard, etc.) until the user scrolls near them.
 * This reduces initial JS execution and prevents layout shifts from
 * components that aren't visible yet.
 * 
 * @returns [ref, isInView] — attach ref to the container, use isInView to conditionally render
 */
export function useInViewport<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewportOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0, rootMargin = '200px 0px', once = true } = options;
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip IntersectionObserver if not supported (SSR or old browsers) — show content immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView];
}
