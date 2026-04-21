export default function FriendsLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--foreground-subtle)' }}>Loading</span>
      </div>
    </div>
  );
}
