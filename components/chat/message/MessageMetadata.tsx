import React from 'react';
import { CornerUpLeft } from 'lucide-react';
import { CyberAudioPlayer } from '@/components/chat/CyberAudioPlayer';

interface Props {
  isAI: boolean;
  messageId?: string;
  message: string;
  voiceId?: string | null;
  onReply?: (target: { id: string; text: string; sender: 'USER' | 'AI' }) => void;
}

export function MessageMetadata({ isAI, messageId, message, voiceId, onReply }: Props) {
  // Only show if there's at least one action to display
  const hasActions = onReply || isAI || !isAI;
  if (!hasActions) return null;

  return (
    <div className={`flex items-center gap-2 px-1 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
      {onReply && messageId && (
        <button
          onClick={() => onReply({ id: messageId, text: message, sender: isAI ? 'AI' : 'USER' })}
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-lg hover:bg-[var(--surface-hover)] active:scale-90"
          style={{ color: 'var(--foreground-subtle)' }}
        >
          <CornerUpLeft className="w-3 h-3" />
        </button>
      )}
      {isAI && (
        <span className="opacity-0 group-hover:opacity-100 transition-all duration-200">
          <CyberAudioPlayer message={message} voiceId={voiceId} />
        </span>
      )}
    </div>
  );
}
