import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { Brain, Sparkles, Flame, Target, Infinity } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 60; // ISR cache for 60 seconds

async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      name: true,
      username: true,
      xp: true,
      currentHP: true,
      diveDepth: true,
      maxDiveDepth: true,
      streak: true,
      detectedLevel: true,
      avgVocabulary: true,
      avgComplexity: true,
      avgFluency: true,
      createdAt: true,
    },
  });

  return user;
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const user = await getPublicProfile(params.username);

  if (!user) {
    notFound();
  }

  const levelName = user.detectedLevel || 'Unranked';
  const scoreRaw = Math.round((user.avgVocabulary + user.avgComplexity + user.avgFluency) / 3) || 0;
  
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--accent-cyan)]/20 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[var(--accent-fuchsia)]/20 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="max-w-md w-full relative z-10 flex flex-col gap-6">
        {/* Profile Card */}
        <div className="liquid-glass-strong rounded-[40px] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          
          {/* Avatar Area */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-quaternary)] flex items-center justify-center text-3xl font-black text-black shadow-xl shrink-0 z-10 relative">
              {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
            </div>
            
            {/* Level Badge overlapping avatar */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-black text-white border border-white/20 whitespace-nowrap z-20 shadow-lg">
              {levelName}
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight mb-1">{user.name || user.username}</h1>
          <p className="text-[14px] text-[var(--foreground-muted)] font-medium mb-8">@{user.username}</p>

          <div className="grid grid-cols-2 gap-3 w-full w-full">
            {/* XP */}
            <div className="liquid-glass rounded-3xl p-4 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105"
              style={{ background: 'var(--surface-hover)' }}>
              <Sparkles className="w-6 h-6 text-[var(--accent-cyan)] mb-1" />
              <p className="text-xl font-black tracking-tight glow-cyan">{user.xp.toLocaleString()}</p>
              <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] font-bold">Total XP</p>
            </div>
            
            {/* Depth */}
            <div className="liquid-glass rounded-3xl p-4 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105"
              style={{ background: 'var(--surface-hover)' }}>
              <Infinity className="w-6 h-6 text-[var(--accent-fuchsia)] mb-1" />
              <p className="text-xl font-black tracking-tight glow-fuchsia">{user.maxDiveDepth}</p>
              <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] font-bold">Max Depth</p>
            </div>

            {/* Streak */}
            <div className="liquid-glass rounded-3xl p-4 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105"
              style={{ background: 'var(--surface-hover)' }}>
              <Flame className="w-6 h-6 text-amber-500 mb-1" />
              <p className="text-xl font-black tracking-tight text-amber-500" style={{ textShadow: '0 0 16px rgba(245,158,11,0.5)' }}>{user.streak}</p>
              <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] font-bold">Day Streak</p>
            </div>

            {/* AI Score */}
            <div className="liquid-glass rounded-3xl p-4 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105"
              style={{ background: 'var(--surface-hover)' }}>
              <Brain className="w-6 h-6 text-[#00e676] mb-1" />
              <p className="text-xl font-black tracking-tight text-[#00e676]" style={{ textShadow: '0 0 16px rgba(0,230,118,0.5)' }}>{scoreRaw}</p>
              <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] font-bold">AI Rating</p>
            </div>
          </div>
          
          <div className="w-full mt-6 flex justify-center">
             <Link href="/">
               <button className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all hover:bg-[var(--surface-hover)]"
                 style={{ borderColor: 'var(--border)'}}>
                 Open Aura
               </button>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
