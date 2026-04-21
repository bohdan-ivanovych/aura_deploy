import { Loader2 } from 'lucide-react';

export default function UpgradeLoading() {
  return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-[var(--background)] p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--border)]/10 flex items-center justify-center mb-6">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--foreground)] opacity-50" />
      </div>
      <h2 className="text-2xl font-black mb-2 animate-pulse text-muted-foreground">Preparing Aura Pro...</h2>
    </div>
  );
}
