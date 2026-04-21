export default function FlashcardsLoading() {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header skeleton */}
      <div className="shrink-0 px-6 pb-6 md:px-8"
        style={{
          paddingTop: 'max(2rem, calc(1rem + env(safe-area-inset-top, 0px)))',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
        <div className="flex items-center justify-between gap-4">
          <div className="h-7 w-32 rounded-xl skeleton-shimmer" 
            style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-10 w-24 rounded-full skeleton-shimmer" 
            style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-8 md:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Section label */}
          <div className="h-3 w-28 rounded-md skeleton-shimmer pl-2" 
            style={{ background: 'rgba(255,255,255,0.04)' }} />
          
          {/* Deck cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="rounded-3xl p-6 space-y-4"
                style={{
                  background: i === 0 ? 'rgba(0,230,118,0.03)' : 'rgba(245,158,11,0.03)',
                  border: `1px solid ${i === 0 ? 'rgba(0,230,118,0.1)' : 'rgba(245,158,11,0.1)'}`,
                  animationDelay: `${i * 150}ms`,
                }}>
                <div className="h-5 w-3/4 rounded-lg skeleton-shimmer" 
                  style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 w-1/3 rounded-lg skeleton-shimmer" 
                  style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-6 w-28 rounded-full mt-8 skeleton-shimmer" 
                  style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>

          {/* Your Decks section */}
          <div className="h-3 w-20 rounded-md skeleton-shimmer" 
            style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="rounded-3xl p-8 flex items-center justify-center"
            style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div className="h-10 w-36 rounded-full skeleton-shimmer" 
              style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
