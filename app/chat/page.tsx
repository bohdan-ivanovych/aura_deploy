import ChatClient from '@/components/chat/ChatClient';
import { getChatSessions } from '@/lib/data/chat';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default async function ChatPage() {
  let initialSessions: Awaited<ReturnType<typeof getChatSessions>> = [];
  try {
    initialSessions = await getChatSessions();
  } catch {
    // DB not yet migrated — ChatClient will load sessions via client-side fetch
  }

  return (
    <ErrorBoundary fallbackLabel="CHAT">
      <ChatClient initialSessions={initialSessions as any} />
    </ErrorBoundary>
  );
}
