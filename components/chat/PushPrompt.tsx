'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

interface PushPromptProps {
  onDismiss: () => void;
}

async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    const json = sub.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt({ onDismiss }: PushPromptProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch { /* silent */ }
    setLoading(false);
    setDone(true);
    setTimeout(onDismiss, 600);
  };

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          className="mx-4 my-2 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,212,0.1) 0%, rgba(0,100,180,0.12) 100%)',
            border: '1px solid rgba(0,212,212,0.22)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,212,212,0.15)', border: '1px solid rgba(0,212,212,0.3)' }}
          >
            <Bell className="w-4 h-4" style={{ color: '#00d4d4' }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-white leading-tight">
              Get notified when your depth drops
            </p>
            <p className="text-[9px] text-white/40 mt-0.5">
              We&apos;ll alert you before you surface
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAllow}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                color: '#000',
              }}
            >
              {loading ? '…' : 'Allow'}
            </button>
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
