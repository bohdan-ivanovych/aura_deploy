'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';

function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function NewRoomPage() {
  const router = useRouter();

  useEffect(() => {
    const roomId = generateRoomId();
    // Default the creator to Player 1
    localStorage.setItem(`room-${roomId}-role`, 'USER_A');
    router.replace(`/room/${roomId}`);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-[var(--background)]">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(168,85,247,0.1))',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Swords className="w-8 h-8 text-cyan-400 opacity-80" />
      </motion.div>
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--foreground)] animate-pulse">
        Forging Arena...
      </h2>
    </div>
  );
}
