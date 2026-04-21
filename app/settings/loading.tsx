import { Loader2 } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--foreground)] opacity-50" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading settings...
        </p>
      </div>
    </div>
  );
}
