'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 2800);
      }
      wasOffline.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ y: -52, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -52, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          role="status"
          aria-live="polite"
          aria-label="No internet connection — offline mode active"
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4"
          style={{
            background: 'rgba(239,68,68,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
          }}
        >
          <WifiOff className="w-3.5 h-3.5 text-white shrink-0" aria-hidden />
          <span className="text-[11px] font-black text-white uppercase tracking-[0.1em]">
            No connection — offline mode
          </span>
        </motion.div>
      )}
      {showRestored && isOnline && (
        <motion.div
          key="restored"
          initial={{ y: -52, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -52, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          role="status"
          aria-live="polite"
          aria-label="Connection restored"
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4"
          style={{
            background: 'rgba(16,185,129,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
          }}
        >
          <Wifi className="w-3.5 h-3.5 text-white shrink-0" aria-hidden />
          <span className="text-[11px] font-black text-white uppercase tracking-[0.1em]">
            Connection restored
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
