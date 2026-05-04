'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Registers the service worker and shows a non-intrusive toast when
 * a new version is available — instead of a silent forced refresh.
 */
export function SWUpdateToast() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // A new SW is installed, the old one is still active.
            // Instead of force-reloading, show a gentle toast.
            toast('✨ New version available', {
              description: 'Tap to refresh and get the latest Aura.',
              duration: Infinity,
              action: {
                label: 'Refresh',
                onClick: () => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                },
              },
            });
          }
        });
      });
    }).catch((err) => {
      // SW registration failures are non-critical — log silently
      console.warn('[SW] Registration failed:', err);
    });

    // If the page loads with a waiting SW (e.g. user visits after SW installed
    // while they were away), tell them immediately.
    navigator.serviceWorker.ready.then(reg => {
      if (reg.waiting) {
        toast('✨ Update ready', {
          description: 'A new version of Aura is ready to load.',
          duration: Infinity,
          action: {
            label: 'Refresh',
            onClick: () => {
              reg.waiting!.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            },
          },
        });
      }
    }).catch(() => { /* ignore */ });
  }, []);

  return null;
}
