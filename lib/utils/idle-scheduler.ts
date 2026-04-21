/**
 * idle-scheduler.ts — Deferred task execution for non-critical work.
 * 
 * WHY: Moves low-priority work (analytics, prefetching, background sync)
 * off the main thread's critical path, improving INP (Interaction to Next Paint).
 * Uses scheduler.postTask() where available (Chromium 94+), falls back to
 * requestIdleCallback, then setTimeout as final fallback.
 */

type TaskPriority = 'user-blocking' | 'user-visible' | 'background';

/**
 * Schedule a task with priority awareness.
 * - 'user-blocking': Run ASAP (but still yielding to browser)
 * - 'user-visible': Run when main thread is less busy
 * - 'background': Run only when idle
 */
export function scheduleTask(
  callback: () => void,
  priority: TaskPriority = 'background'
): void {
  // Modern Scheduler API (Chromium 94+)
  if ('scheduler' in globalThis && typeof (globalThis as any).scheduler?.postTask === 'function') {
    (globalThis as any).scheduler.postTask(callback, { priority });
    return;
  }

  // Fallback: requestIdleCallback for background tasks, rAF for visible
  if (priority === 'background' && typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => callback(), { timeout: 5000 });
    return;
  }

  if (priority === 'user-visible' && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => callback());
    return;
  }

  // Final fallback — setTimeout with priority-based delay
  const delay = priority === 'user-blocking' ? 0 : priority === 'user-visible' ? 16 : 100;
  setTimeout(callback, delay);
}

/**
 * Prefetch a route's JS chunk during idle time.
 * WHY: Preloads the next likely navigation target so transitions feel instant.
 * Only runs when the browser is idle — zero impact on current page performance.
 */
export function prefetchRoute(href: string): void {
  scheduleTask(() => {
    // Don't prefetch if already in cache or if connection is slow
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
        return; // Respect data-saver and slow connections
      }
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    
    // Prevent duplicate prefetches
    const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
    if (!existing) {
      document.head.appendChild(link);
    }
  }, 'background');
}

/**
 * Run a callback when the browser is idle, with a deadline-aware loop.
 * WHY: For chunked work (e.g., processing a list of items) that should
 * yield to user interactions.
 */
export function runWhenIdle(callback: (deadline: { timeRemaining: () => number }) => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback((deadline) => callback(deadline));
  } else {
    // Polyfill: simulate 50ms idle budget
    setTimeout(() => {
      const start = Date.now();
      callback({
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 100);
  }
}
