import React from 'react';
import { Copy } from 'lucide-react';
import MagicTextWrapper from '@/components/chat/MagicTextWrapper';
import { ActiveRecall } from '@/components/chat/ActiveRecall';
import { haptics } from '@/lib/utils/haptics';

interface GrammarProps {
  messageId?: string;
  grammarCorrection: string;
  weaknessIdentified?: string | null;
}

/**
 * GrammarCorrectionCard — displays grammar/vocab feedback below AI messages.
 * 
 * Expected format from AI: "❌ wrong phrase → ✅ correct phrase — rule explanation"
 * Falls back to plain text display if format doesn't match.
 */
export function GrammarCorrectionCard({ messageId, grammarCorrection, weaknessIdentified }: GrammarProps) {
  const isVocab = weaknessIdentified === 'vocabulary' || weaknessIdentified === 'collocation' || weaknessIdentified === 'false cognate';
  
  // Color coding: amber for grammar, purple for vocab
  const colorRgb = isVocab ? '167,139,250' : '251,191,36';
  const title = isVocab ? 'Vocabulary' : 'Grammar Note';
  const accentHex = isVocab ? '#a78bfa' : '#fbbf24';

  const parsed = parseCorrection(grammarCorrection);

  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-sm transition-all" 
      style={{ 
        border: `1px solid rgba(${colorRgb}, 0.15)`,
        background: `rgba(${colorRgb}, 0.02)`,
      }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2"
        style={{ 
          background: `rgba(${colorRgb}, 0.08)`, 
          borderBottom: `1px solid rgba(${colorRgb}, 0.12)`,
          backdropFilter: 'blur(10px)',
        }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentHex, boxShadow: `0 0 8px ${accentHex}` }} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-90" style={{ color: accentHex }}>
            {title}
          </span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(grammarCorrection); haptics.light(); }}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors active:scale-90"
          style={{ color: accentHex }}
        >
          <Copy className="w-3 h-3 opacity-60" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)' }}>
        {parsed ? (
          <div className="space-y-3">
            {/* Split logic: Wrong vs Right */}
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

            {/* Rule explanation with a subtle separator */}
            {parsed.explanation && (
              <div className="pt-3 border-t border-white/5">
                <p className="text-[12px] leading-relaxed font-medium" style={{ color: 'var(--foreground-muted)' }}>
                  {parsed.explanation}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Fallback: plain text */
          <MagicTextWrapper fullMessageText={grammarCorrection}>
            <p className="text-[13px] leading-relaxed text-[var(--foreground-muted)] select-text font-medium">
              {grammarCorrection}
            </p>
          </MagicTextWrapper>
        )}

        {messageId && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <ActiveRecall
              messageId={messageId}
              grammarCorrection={grammarCorrection}
              weaknessRule={weaknessIdentified || null}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Parse the structured correction format:
 * "❌ wrong phrase → ✅ correct phrase — explanation"
 */
function parseCorrection(text: string): { wrong: string; correct: string; explanation: string } | null {
  // Try the ❌ → ✅ — format
  const match = text.match(/❌\s*(.+?)\s*→\s*✅\s*(.+?)(?:\s*—\s*(.+))?$/);
  if (match) {
    return {
      wrong: match[1].trim(),
      correct: match[2].trim().replace(/\s*—.*$/, ''), // Clean trailing explanation from correct
      explanation: match[3]?.trim() || '',
    };
  }

  // Try the quoted format: "correct" — explanation
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

interface SuggestionProps {
  suggestion: string;
}

export function SuggestionCard({ suggestion }: SuggestionProps) {
  return (
    <div className="mt-2 rounded-xl px-3 py-2 flex items-start gap-2"
      style={{ background: 'rgba(0,212,212,0.05)', border: '1px solid rgba(0,212,212,0.12)' }}>
      <span className="text-[9px] shrink-0 mt-0.5" style={{ color: 'rgba(0,212,212,0.7)' }}>✦</span>
      <MagicTextWrapper fullMessageText={suggestion}>
        <p className="text-[11.5px] italic leading-relaxed select-text" style={{ color: 'rgba(0,212,212,0.8)' }}>
          {suggestion}
        </p>
      </MagicTextWrapper>
    </div>
  );
}
