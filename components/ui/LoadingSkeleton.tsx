'use client';

import React from 'react';

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 rounded w-1/4" style={{ background: 'var(--surface)' }}></div>
      <div className="space-y-2">
        <div className="h-4 rounded" style={{ background: 'var(--surface)' }}></div>
        <div className="h-4 rounded w-5/6" style={{ background: 'var(--surface)' }}></div>
        <div className="h-4 rounded w-4/6" style={{ background: 'var(--surface)' }}></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 rounded" style={{ background: 'var(--surface)' }}></div>
        <div className="h-20 rounded" style={{ background: 'var(--surface)' }}></div>
        <div className="h-20 rounded" style={{ background: 'var(--surface)' }}></div>
      </div>
    </div>
  );
}

export function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="p-6 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }}>
        <div className="h-4 rounded mb-2" style={{ background: 'var(--border)' }}></div>
        <div className="h-8 rounded" style={{ background: 'var(--border)' }}></div>
      </div>
      <div className="p-6 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }}>
        <div className="h-4 rounded mb-2" style={{ background: 'var(--border)' }}></div>
        <div className="h-8 rounded" style={{ background: 'var(--border)' }}></div>
      </div>
      <div className="p-6 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }}>
        <div className="h-4 rounded mb-2" style={{ background: 'var(--border)' }}></div>
        <div className="h-8 rounded" style={{ background: 'var(--border)' }}></div>
      </div>
    </div>
  );
}
