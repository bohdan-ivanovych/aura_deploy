import { Loader2 } from 'lucide-react';

export default function ProfileLoading() {
  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background">
       <div className="flex-1 flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
       </div>
    </div>
  );
}
