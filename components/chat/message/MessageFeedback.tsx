import React, { ReactNode } from 'react';
import { Copy, Sparkles, BookOpen } from 'lucide-react';
import MagicTextWrapper from '@/components/chat/MagicTextWrapper';
import { ActiveRecall } from '@/components/chat/ActiveRecall';
import { haptics } from '@/lib/utils/haptics';

export interface BaseNoteCardProps {
  title: string;
  colorRgb: string;
  accentHex: string;
  onCopyText?: string;
  icon?: ReactNode;
  children: ReactNode;
  messageId?: string;
  weaknessRule?: string | null;
  recallText?: string;
}

export function BaseNoteCard({ title, colorRgb, accentHex, onCopyText, icon, children, messageId, weaknessRule, recallText }: BaseNoteCardProps) {
  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-sm transition-all" 
      style={{ 
        border: `1px solid rgba(${colorRgb}, 0.15)`,
        background: `rgba(${colorRgb}, 0.08)`,
        backdropFilter: 'blur(16px)',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2"
        style={{ 
          background: `rgba(${colorRgb}, 0.08)`, 
          borderBottom: `1px solid rgba(${colorRgb}, 0.12)`,
          backdropFilter: 'blur(10px)',
        }}>
        <div className="flex items-center gap-2">
          {icon || <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentHex, boxShadow: `0 0 8px ${accentHex}` }} />}
          <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-90" style={{ color: accentHex }}>
            {title}
          </span>
        </div>
        {onCopyText && (
          <button
            onClick={() => { navigator.clipboard.writeText(onCopyText); haptics.light(); }}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors active:scale-90"
            style={{ color: accentHex }}
          >
            <Copy className="w-3 h-3 opacity-60" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3.5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)', backdropFilter: 'blur(12px)' }}>
        {children}

        {messageId && recallText && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <ActiveRecall
              messageId={messageId}
              grammarCorrection={recallText}
              weaknessRule={weaknessRule || null}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function parseCorrection(text: any): { wrong: string; correct: string; explanation: string } | null {
  if (typeof text !== 'string') return null;
  const match = text.match(/❌\s*(.+?)\s*→\s*✅\s*(.+?)(?:\s*—\s*(.+))?$/);
  if (match) {
    return {
      wrong: match[1].trim(),
      correct: match[2].trim().replace(/\s*—.*$/, ''),
      explanation: match[3]?.trim() || '',
    };
  }
  const quotedMatch = text.match(/^"(.+?)"\s*—\s*(.+)$/);
  if (quotedMatch) {
    return {
      wrong: '',
      correct: quotedMatch[1].trim(),
      explanation: quotedMatch[2].trim(),
    };
  }
  return null;
}

export function GrammarNoteCard({ messageId, text, weaknessIdentified }: { messageId?: string; text: any; weaknessIdentified?: string | null }) {
  const safeText = typeof text === 'string' ? text : String(text || '');
  const parsed = parseCorrection(safeText);
  return (
    <BaseNoteCard
      title="Grammar Note"
      colorRgb="251,191,36"
      accentHex="#fbbf24"
      onCopyText={safeText}
      messageId={messageId}
      recallText={safeText}
      weaknessRule={weaknessIdentified}
    >
      {parsed ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2.5">
            {parsed.wrong && (
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] mt-0.5 opacity-40">❌</span>
                <span className="text-[13px] font-medium leading-normal line-through opacity-50" style={{ color: 'var(--foreground)' }}>
                  {parsed.wrong}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] mt-0.5">✅</span>
              <span className="text-[14px] font-bold leading-normal" style={{ color: 'var(--foreground)' }}>
                {parsed.correct}
              </span>
            </div>
          </div>
          {parsed.explanation && (
            <div className="pt-3 border-t border-white/5">
              <p className="text-[12px] leading-relaxed font-medium" style={{ color: 'var(--foreground-muted)' }}>
                {parsed.explanation}
              </p>
            </div>
          )}
        </div>
      ) : (
        <MagicTextWrapper fullMessageText={safeText}>
          <p className="text-[13px] leading-relaxed text-[var(--foreground-muted)] select-text font-medium">
            {safeText}
          </p>
        </MagicTextWrapper>
      )}
    </BaseNoteCard>
  );
}

export function VocabularyNoteCard({ messageId, text, weaknessIdentified }: { messageId?: string; text: any; weaknessIdentified?: string | null }) {
  const safeText = typeof text === 'string' ? text : String(text || '');
  return (
    <BaseNoteCard
      title="Vocabulary Note"
      colorRgb="167,139,250"
      accentHex="#a78bfa"
      onCopyText={safeText}
      icon={<BookOpen className="w-3 h-3" />}
      messageId={messageId}
      recallText={safeText}
      weaknessRule={weaknessIdentified}
    >
      <MagicTextWrapper fullMessageText={safeText}>
        <p className="text-[13px] leading-relaxed select-text font-medium" style={{ color: 'var(--foreground)' }}>
          {safeText}
        </p>
      </MagicTextWrapper>
    </BaseNoteCard>
  );
}

export function VibeNoteCard({ text }: { text: any }) {
  const safeText = typeof text === 'string' ? text : String(text || '');
  return (
    <BaseNoteCard
      title="Vibe Note"
      colorRgb="244,63,94"
      accentHex="#f43f5e"
      onCopyText={safeText}
      icon={<Sparkles className="w-3 h-3" />}
    >
      <MagicTextWrapper fullMessageText={safeText}>
        <p className="text-[13px] leading-relaxed select-text font-medium" style={{ color: 'var(--foreground)' }}>
          {safeText}
        </p>
      </MagicTextWrapper>
    </BaseNoteCard>
  );
}
