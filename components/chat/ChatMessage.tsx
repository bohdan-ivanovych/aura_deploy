'use client';

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, CornerUpLeft, Zap } from 'lucide-react';
import { haptics } from '@/lib/utils/haptics';

import { ContextMenu, MessageRect } from '@/components/chat/ContextMenu';
import { GrammarExplainSheet } from '@/components/chat/GrammarExplainSheet';
import ClickableWordText from '@/components/chat/ClickableWordText';
import MagicTextWrapper from '@/components/chat/MagicTextWrapper';
import { usePopupStore } from '@/lib/stores/popup-store';

import { 
  ErrorHighlightedText, 
  FloatingMetersBadge, 
  TypingDots, 
  ReadReceipt, 
  BubbleTail 
} from './message/MessageDecorations';
import { GrammarNoteCard, VocabularyNoteCard, VibeNoteCard } from './message/MessageFeedback';
import { TikTokNoteCard, type TikTokNoteData } from './message/TikTokNoteCard';
import { ReactionPill, ReactionPicker } from './message/MessageReactions';
import { MessageMetadata } from './message/MessageMetadata';

export interface ReplyTarget {
  id: string;
  text: string;
  sender: 'USER' | 'AI';
}

interface ChatMessageProps {
  message: string;
  senderType: 'USER_A' | 'USER_B' | 'AI_PERSONA';
  grammarCorrection?: string | null;
  weaknessIdentified?: string | null;
  xpReward?: number;
  vocabularyNote?: string | null;
  vibeNote?: string | null;
  errorSpan?: { original: string; corrected: string } | null;
  conversationContext?: Array<{ text: string; sender: 'user' | 'ai' }>;
  persona?: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  showAvatar?: boolean;
  voiceId?: string | null;
  metrics?: any;
  createdAt?: Date | string | null;
  messageId?: string;
  isEditing?: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string, deleteForAI?: boolean) => void;
  onExplain?: (text: string) => void;
  onReply?: (target: ReplyTarget) => void;
  edited?: boolean;
  replyTo?: ReplyTarget | null;
  reelMode?: boolean;
  isReelSelected?: boolean;
  reelSelectionIndex?: number;
  onReelToggle?: (id: string) => void;
  onWordPopupRead?: () => void;
  reaction?: string | null;
  onReaction?: (messageId: string, emoji: string) => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  readState?: 'sent' | 'received' | 'read';
  isTyping?: boolean;
  isAudio?: boolean;
  audioDuration?: number | null;
  showMagicHint?: boolean;
  tiktokNote?: TikTokNoteData | null;
  isHistorical?: boolean;
  suggestion?: string | null;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  senderType,
  grammarCorrection,
  weaknessIdentified,
  xpReward,
  vocabularyNote,
  vibeNote,
  errorSpan,
  persona = 'AI Assistant',
  senderName,
  senderAvatar,
  showAvatar = false,
  metrics,
  voiceId,
  createdAt,
  messageId,
  isEditing,
  onEdit,
  onDelete,
  onExplain,
  onReply,
  edited,
  replyTo,
  reelMode = false,
  isReelSelected = false,
  reelSelectionIndex,
  onReelToggle,
  onWordPopupRead,
  reaction,
  onReaction,
  isFirstInGroup = true,
  isLastInGroup = true,
  readState,
  isTyping = false,
  isAudio = false,
  audioDuration,
  showMagicHint = false,
  isHistorical = false,
  tiktokNote,
  suggestion,
}: ChatMessageProps) {
  const isAI = senderType === 'AI_PERSONA';
  const [editText, setEditText] = useState(message);
  
  const magicHintWordIndices = React.useMemo(() => {
    if (!showMagicHint || !isAI) return undefined;
    try { if (localStorage.getItem('magic_hint_shown') === 'true') return undefined; } catch {}
    const parts = message.split(/(\s+)/);
    const wordPositions: number[] = [];
    let tokenIdx = 0;
    for (const part of parts) {
      if (!part) { tokenIdx++; continue; }
      if (!/^\s+$/.test(part) && part.replace(/[.,!?;:"""]+/g, '').length > 2) {
        wordPositions.push(tokenIdx);
      }
      tokenIdx++;
    }
    if (wordPositions.length === 0) return undefined;
    const count = Math.min(Math.ceil(wordPositions.length * 0.12) + 1, 3);
    const shuffled = [...wordPositions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).sort((a, b) => a - b);
  }, [showMagicHint, isAI, message]);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [messageRect, setMessageRect] = useState<MessageRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Task 2: singleton grammar sheet — only one open across all messages
  const { openPopup, openPopupById, closePopup } = usePopupStore();
  const grammarSheetKey = `correction-${messageId ?? 'unknown'}`;
  const grammarSheetOpen = openPopup?.type === 'correction' && openPopup.id === grammarSheetKey;

  const [showMetersBadge, setShowMetersBadge] = useState(false);
  const hasShownMeters = useRef(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);

  const openContextMenu = useCallback(() => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    setMessageRect({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, isAI });
    setContextMenuVisible(true);
  }, [isAI]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchMovedRef.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        haptics.medium();
        openContextMenu();
      }
    }, 420);
  };

  const handleTouchMove = () => {
    touchMovedRef.current = true;
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  useEffect(() => {
    if (!hasShownMeters.current && (xpReward !== undefined || grammarCorrection)) {
      const t = setTimeout(() => { setShowMetersBadge(true); hasShownMeters.current = true; }, 400);
      return () => clearTimeout(t);
    }
  }, [xpReward, grammarCorrection]);

  const handleSaveEdit = () => {
    if (onEdit && messageId) onEdit(messageId, editText);
  };

  const timeString = createdAt
    ? new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  const showMeters = !isHistorical && xpReward !== undefined && typeof window !== 'undefined' && showMetersBadge;
  const metersValue = xpReward ?? 0;

  const avatarEl = isAI && showAvatar ? (
    isFirstInGroup ? (
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {senderAvatar ? (
          <img src={senderAvatar} alt={senderName || persona} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: 'var(--accent-primary)' }}>
            {(senderName || persona).charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    ) : <div className="w-8 h-8 shrink-0" />
  ) : null;

  if (isTyping) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="flex w-full items-end gap-2 justify-start pr-10 md:pr-20">
        {showAvatar && <div className="w-8 h-8 shrink-0" />}
        <div className="px-4 py-3 relative" style={{ background: 'var(--bubble-ai-bg)', border: '1px solid var(--bubble-ai-border)', boxShadow: 'var(--bubble-ai-shadow)', borderRadius: '18px 18px 18px 4px' }}>
          <BubbleTail isAI={true} />
          <TypingDots />
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={isHistorical ? false : { opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: contextMenuVisible ? 1.025 : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={`flex w-full group items-end gap-2 ${isAI ? 'justify-start pr-10 md:pr-20' : 'justify-end pl-10 md:pl-20'} ${contextMenuVisible ? 'relative z-[205]' : ''} ${reelMode ? 'cursor-pointer' : ''}`}
        onClick={reelMode && messageId && onReelToggle ? () => onReelToggle(messageId) : undefined}
      >
        {reelMode && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
            style={{ borderColor: isReelSelected ? 'var(--accent-cyan)' : 'var(--border)', background: isReelSelected ? 'var(--accent-cyan)' : 'transparent', boxShadow: isReelSelected ? '0 0 10px rgba(0,212,212,0.5)' : 'none', marginBottom: '8px' }}>
            {isReelSelected && reelSelectionIndex !== undefined && (
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#000', lineHeight: 1 }}>{reelSelectionIndex}</span>
            )}
          </motion.div>
        )}

        {isAI && avatarEl}

        <div className={`flex flex-col max-w-[84%] md:max-w-[78%] ${isAI ? 'items-start' : 'items-end'}`} style={{ gap: '2px' }}>
          {isAI && showAvatar && isFirstInGroup && (senderName || persona) && (
            <span className="text-[10px] font-semibold px-1 mb-0.5" style={{ color: 'var(--accent-primary)' }}>{senderName || persona}</span>
          )}

          <div 
            ref={bubbleRef} 
            className="relative flex flex-col gap-[6px] max-w-full"
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {message.split('\n\n').map((bubbleText, idx, arr) => {
              const isLastBubble = idx === arr.length - 1;
              const isFirstBubble = idx === 0;
              const currentBorderRadius = isAI ? {
                borderTopLeftRadius: (isFirstInGroup && isFirstBubble) ? '18px' : '6px',
                borderTopRightRadius: '18px',
                borderBottomRightRadius: '18px',
                borderBottomLeftRadius: (isLastInGroup && isLastBubble) ? '4px' : '6px',
              } : {
                borderTopLeftRadius: '18px',
                borderTopRightRadius: (isFirstInGroup && isFirstBubble) ? '18px' : '6px',
                borderBottomRightRadius: (isLastInGroup && isLastBubble) ? '4px' : '6px',
                borderBottomLeftRadius: '18px',
              };

              return (
                <div
                  key={idx}
                  className={`relative px-4 py-3 transition-all ${reelMode && isAI ? 'select-text' : 'select-none'}`}
                  style={isAI ? {
                    background: 'var(--bubble-ai-bg)', border: '1px solid var(--bubble-ai-border)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), var(--bubble-ai-shadow)', isolation: 'isolate', WebkitTouchCallout: reelMode ? 'default' : 'none', userSelect: reelMode ? 'text' : 'none', WebkitUserSelect: reelMode ? 'text' : 'none', ...currentBorderRadius,
                  } : {
                    background: 'var(--bubble-user-bg)', border: '1px solid var(--bubble-user-border)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), var(--bubble-user-shadow)', isolation: 'isolate', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none', ...currentBorderRadius,
                  }}
                >
                  {isLastInGroup && isLastBubble && <BubbleTail isAI={isAI} />}
                  
                  {isLastBubble && showMeters && xpReward !== undefined && !isAI && <FloatingMetersBadge value={metersValue} />}

                  {isFirstBubble && replyTo && (
                    <div className={`mb-2 pb-2 flex items-start gap-2 rounded-lg px-2 py-1.5 border-l-2`}
                      style={{ borderLeftColor: isAI ? 'rgba(0,212,212,0.5)' : 'var(--border)', background: isAI ? 'rgba(0,212,212,0.06)' : 'var(--surface-hover)' }}>
                      <CornerUpLeft className="w-3 h-3 mt-0.5 shrink-0" style={{ color: isAI ? 'rgba(0,212,212,0.7)' : 'var(--foreground-muted)' }} />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: isAI ? 'rgba(0,212,212,0.8)' : 'var(--foreground-muted)' }}>{replyTo.sender === 'USER' ? 'You' : persona}</span>
                        <p className="text-[11px] truncate leading-snug" style={{ color: 'var(--foreground-muted)' }}>{replyTo.text.slice(0, 80)}{replyTo.text.length > 80 ? '…' : ''}</p>
                      </div>
                    </div>
                  )}

                  {isEditing && isFirstBubble ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] resize-none text-sm outline-none focus:border-[var(--accent-cyan)]"
                        rows={3} autoFocus />
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditText(message)} className="tap-target rounded-xl hover:bg-red-500/15 transition-colors text-red-400"><X className="w-4 h-4" /></button>
                        <button onClick={handleSaveEdit} className="tap-target rounded-xl hover:bg-green-500/15 transition-colors text-green-400"><Check className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : !isEditing && isAI ? (
                    reelMode ? (
                      <MagicTextWrapper fullMessageText={bubbleText}>
                        <p className="text-[14px] leading-[1.8] font-medium text-[var(--foreground)] tracking-[0.005em] select-text break-words whitespace-pre-wrap">{bubbleText}</p>
                      </MagicTextWrapper>
                    ) : (
                      <ClickableWordText text={bubbleText} voiceId={voiceId} fullMessageText={bubbleText} magicHintWordIndices={magicHintWordIndices} />
                    )
                  ) : !isEditing && errorSpan ? (
                    <ErrorHighlightedText text={bubbleText} errorSpan={errorSpan} onReadTimeout={onWordPopupRead} />
                  ) : !isEditing && (
                    <p className="text-[14px] leading-[1.65] font-medium text-[var(--foreground)] tracking-[0.005em] after:content-[''] after:inline-block after:w-[46px] after:h-2 break-words whitespace-pre-wrap">{bubbleText}</p>
                  )}

                  {isLastBubble && (grammarCorrection || vocabularyNote || vibeNote || tiktokNote) ? (
                    <div className="flex items-center gap-0.5 justify-end mt-1 pointer-events-none select-none" style={{ opacity: 0.45 }}>
                      {edited && <span className="text-[9px] font-medium italic" style={{ color: 'var(--foreground)' }}>edited</span>}
                      {timeString && <span className="text-[9px] font-medium tracking-wide" style={{ color: 'var(--foreground)' }}>{timeString}</span>}
                      {!isAI && readState && <ReadReceipt state={readState} />}
                    </div>
                  ) : isLastBubble && (
                    <div className="absolute bottom-2 right-2.5 flex items-center gap-0.5 pointer-events-none select-none" style={{ opacity: 0.55 }}>
                      {edited && <span className="text-[9px] font-medium italic" style={{ color: 'var(--foreground)' }}>edited</span>}
                      {timeString && <span className="text-[9px] font-medium tracking-wide" style={{ color: 'var(--foreground)' }}>{timeString}</span>}
                      {!isAI && readState && <ReadReceipt state={readState} />}
                    </div>
                  )}
                </div>
              );
            })}

            <ReactionPill reaction={reaction || null} isAI={isAI} />
          </div>

          {/* Grammar/Vocabulary Note card rendered outside the bubbleRef wrapper so it isn't copied or long-pressed */}
          {(grammarCorrection || vocabularyNote || vibeNote || tiktokNote) && (
            <div className="mt-2 w-full max-w-full relative z-[10] self-stretch">
              <div className="rounded-xl overflow-hidden backdrop-blur-xl shadow-sm" style={{ background: 'var(--surface)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-0.5">
                  {grammarCorrection ? (
                    <GrammarNoteCard messageId={messageId} text={grammarCorrection} weaknessIdentified={weaknessIdentified} />
                  ) : tiktokNote ? (
                    <TikTokNoteCard data={tiktokNote} />
                  ) : vocabularyNote ? (
                    <VocabularyNoteCard messageId={messageId} text={vocabularyNote} weaknessIdentified={weaknessIdentified} />
                  ) : vibeNote ? (
                    <VibeNoteCard text={vibeNote} />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {isLastInGroup && (
             <MessageMetadata isAI={isAI} messageId={messageId} message={message} voiceId={voiceId} onReply={onReply} />
          )}
        </div>
      </motion.div>

      <ContextMenu
        isVisible={contextMenuVisible}
        onClose={() => setContextMenuVisible(false)}
        messageRect={messageRect}
        message={{ id: messageId || '', text: message, sender: isAI ? 'AI' : 'USER' }}
        metrics={metrics}
        voiceId={voiceId}
        onEdit={(id, text) => { setEditText(text); if (onEdit) onEdit(id, text); }}
        onDelete={(id, forAI) => { if (onDelete) onDelete(id, forAI); }}
        onReact={onReaction && messageId ? (emoji: string) => onReaction(messageId, emoji) : undefined}
        onCopy={(text) => navigator.clipboard.writeText(text)}
        onSpeak={() => {}}
        onExplain={isAI ? () => { setContextMenuVisible(false); openPopupById('correction', grammarSheetKey); } : undefined}
        onReply={onReply && messageId ? () => { onReply({ id: messageId, text: message, sender: isAI ? 'AI' : 'USER' }); setContextMenuVisible(false); } : undefined}
      />
      <GrammarExplainSheet
        isOpen={grammarSheetOpen}
        onClose={closePopup}
        messageText={message}
      />
    </>
  );
});