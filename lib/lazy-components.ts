import dynamic from 'next/dynamic';
import React from 'react';
import { LoadingSkeleton } from '@/components/ui/OptimizedComponents';

// Lazy load heavy components with loading states
export const LazyPersonaStudio = dynamic(
  () => import('@/components/chat/PersonaStudio').then(mod => ({ default: mod.PersonaStudio })),
  {
    loading: () => React.createElement(LoadingSkeleton, { className: "w-full h-96 rounded-2xl" }),
    ssr: false
  }
);

export const LazyShareAction = dynamic(
  () => import('@/components/chat/ShareAction').then(mod => ({ default: mod.ShareAction })),
  {
    loading: () => React.createElement(LoadingSkeleton, { className: "w-8 h-8 rounded-lg" }),
    ssr: false
  }
);

export const LazySavePhraseModal = dynamic(
  () => import('@/components/chat/SavePhraseModal').then(mod => ({ default: mod.SavePhraseModal })),
  {
    loading: () => React.createElement(LoadingSkeleton, { className: "w-full h-64 rounded-2xl" }),
    ssr: false
  }
);

export const LazySkillTreeGrid = dynamic(
  () => import('@/components/dashboard/SkillTreeGrid').then(mod => ({ default: mod.SkillTreeGrid })),
  {
    loading: () => React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" },
      [...Array(6)].map((_, i) => React.createElement(LoadingSkeleton, { key: i, className: "h-48 rounded-2xl" }))
    ),
    ssr: false
  }
);


// Simple lazy loading for future chart components
export const LazyChart = dynamic(
  () => Promise.resolve({ default: () => React.createElement(LoadingSkeleton, { className: "w-full h-64 rounded-2xl" }) }),
  {
    loading: () => React.createElement(LoadingSkeleton, { className: "w-full h-64 rounded-2xl" }),
    ssr: false
  }
);

// Simple lazy loading for icons
export const LazyLucideIcon = dynamic(
  () => Promise.resolve({ default: () => React.createElement('div', { className: "w-5 h-5 bg-[var(--surface-hover)] rounded animate-pulse" }) }),
  {
    loading: () => React.createElement('div', { className: "w-5 h-5 bg-[var(--surface-hover)] rounded animate-pulse" }),
    ssr: false
  }
);
