export default function OnboardingLoading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <span className="text-xs text-[var(--foreground-muted)] tracking-widest uppercase">Initializing...</span>
      </div>
    </div>
  );
}
