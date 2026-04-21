'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Trophy, Brain, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface SkillQuizModalProps {
  nodeSlug: string;
  nodeTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onPassed: (score: number, total: number) => void;
}

const PASS_THRESHOLD = 0.6;

function ProgressDots({ total, current, answers }: { total: number; current: number; answers: (number | null)[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {Array.from({ length: total }).map((_, i) => {
        const answered = answers[i] !== null && answers[i] !== undefined;
        const isCurrent = i === current && !answered;
        return (
          <motion.div
            key={i}
            animate={isCurrent ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="rounded-full"
            style={{
              width: isCurrent ? '10px' : '8px',
              height: isCurrent ? '10px' : '8px',
              background: answered
                ? (answers[i] !== null ? '#00d4d4' : 'rgba(255,255,255,0.15)')
                : isCurrent
                  ? '#00d4d4'
                  : 'rgba(255,255,255,0.12)',
              boxShadow: isCurrent ? '0 0 8px rgba(0,212,212,0.8)' : undefined,
              border: isCurrent ? '1px solid rgba(0,212,212,0.5)' : '1px solid rgba(255,255,255,0.1)',
            }}
          />
        );
      })}
    </div>
  );
}

export function SkillQuizModal({ nodeSlug, nodeTitle, isOpen, onClose, onPassed }: SkillQuizModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'quiz' | 'result'>('loading');

  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPhase('loading');
    try {
      const res = await fetch('/api/skill-tree/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: nodeSlug }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to load quiz');
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentIdx(0);
      setSelectedOption(null);
      setShowExplanation(false);
      setQuizDone(false);
      setPhase('quiz');
    } catch (e) {
      setError((e as Error).message);
      setPhase('loading');
    } finally {
      setLoading(false);
    }
  }, [nodeSlug]);

  useEffect(() => {
    if (isOpen && questions.length === 0) {
      void fetchQuiz();
    }
  }, [isOpen, questions.length, fetchQuiz]);

  const handleSelectOption = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    setShowExplanation(true);
    const newAnswers = [...answers];
    newAnswers[currentIdx] = optIdx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizDone(true);
      setPhase('result');
    }
  };

  const score = answers.filter((a, i) => a !== null && a === questions[i]?.correct).length;
  const total = questions.length;
  const pct = total > 0 ? score / total : 0;
  const passed = pct >= PASS_THRESHOLD;

  const handleClose = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrentIdx(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setQuizDone(false);
    setPhase('loading');
    onClose();
  };

  const handleRetry = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrentIdx(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setQuizDone(false);
    void fetchQuiz();
  };

  const currentQ = questions[currentIdx];
  const isCorrect = selectedOption === currentQ?.correct;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(145deg, rgba(4,12,28,0.98) 0%, rgba(6,18,38,0.98) 100%)',
              border: '1px solid rgba(0,212,212,0.15)',
              boxShadow: '0 0 60px rgba(0,212,212,0.12), 0 32px 64px rgba(0,0,0,0.6)',
              maxHeight: '90vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,212,212,0.12)', border: '1px solid rgba(0,212,212,0.25)' }}>
                  <Brain className="w-4 h-4" style={{ color: '#00d4d4' }} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(0,212,212,0.7)' }}>
                    Unlock Test
                  </p>
                  <h2 className="text-[13px] font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {nodeTitle}
                  </h2>
                </div>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10">
                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* LOADING */}
              {phase === 'loading' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  {error ? (
                    <>
                      <p className="text-sm text-red-400 text-center">{error}</p>
                      <button onClick={fetchQuiz}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-wide"
                        style={{ background: 'rgba(0,212,212,0.12)', border: '1px solid rgba(0,212,212,0.25)', color: '#00d4d4' }}>
                        <RotateCcw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 className="w-8 h-8" style={{ color: '#00d4d4' }} />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-[12px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(0,212,212,0.8)' }}>
                          Generating questions…
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          AI is crafting a personalized test
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* QUIZ */}
              {phase === 'quiz' && currentQ && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                  >
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]"
                          style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Question {currentIdx + 1} of {total}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]"
                          style={{ color: 'rgba(0,212,212,0.6)' }}>
                          {Math.round(PASS_THRESHOLD * 100)}% to pass
                        </span>
                      </div>
                      <div className="w-full h-1 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          animate={{ width: `${((currentIdx) / total) * 100}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={{ background: 'linear-gradient(90deg, #00d4d4, #00a8ff)' }}
                        />
                      </div>
                      <ProgressDots total={total} current={currentIdx} answers={answers} />
                    </div>

                    {/* Question */}
                    <div className="rounded-2xl p-4"
                      style={{ background: 'rgba(0,212,212,0.05)', border: '1px solid rgba(0,212,212,0.12)' }}>
                      <p className="text-[14px] font-semibold leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {currentQ.question}
                      </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {currentQ.options.map((opt, i) => {
                        const isSelected = selectedOption === i;
                        const isCorrectOpt = i === currentQ.correct;
                        const revealed = selectedOption !== null;

                        let bgColor = 'rgba(255,255,255,0.04)';
                        let borderColor = 'rgba(255,255,255,0.09)';
                        let textColor = 'rgba(255,255,255,0.7)';

                        if (revealed) {
                          if (isCorrectOpt) {
                            bgColor = 'rgba(16,185,129,0.12)';
                            borderColor = 'rgba(52,211,153,0.4)';
                            textColor = 'rgba(52,211,153,1)';
                          } else if (isSelected && !isCorrectOpt) {
                            bgColor = 'rgba(239,68,68,0.1)';
                            borderColor = 'rgba(239,68,68,0.35)';
                            textColor = 'rgba(239,68,68,0.9)';
                          }
                        } else if (isSelected) {
                          bgColor = 'rgba(0,212,212,0.1)';
                          borderColor = 'rgba(0,212,212,0.35)';
                          textColor = '#00d4d4';
                        }

                        return (
                          <motion.button
                            key={i}
                            type="button"
                            whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                            onClick={() => handleSelectOption(i)}
                            disabled={selectedOption !== null}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                            style={{ background: bgColor, border: `1px solid ${borderColor}`, cursor: selectedOption !== null ? 'default' : 'pointer' }}
                            animate={{ background: bgColor, borderColor }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                              style={{ background: 'rgba(255,255,255,0.06)', color: textColor }}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-[13px] font-medium leading-snug flex-1" style={{ color: textColor }}>
                              {opt.replace(/^[A-D]\.\s*/, '')}
                            </span>
                            {revealed && isCorrectOpt && (
                              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#34d399' }} />
                            )}
                            {revealed && isSelected && !isCorrectOpt && (
                              <XCircle className="w-4 h-4 shrink-0" style={{ color: '#ef4444' }} />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <AnimatePresence>
                      {showExplanation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl p-3.5 space-y-1"
                            style={{
                              background: isCorrect ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                              border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            }}>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]"
                              style={{ color: isCorrect ? 'rgba(52,211,153,0.8)' : 'rgba(239,68,68,0.8)' }}>
                              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </p>
                            <p className="text-[12px] leading-relaxed"
                              style={{ color: 'rgba(255,255,255,0.65)' }}>
                              {currentQ.explanation}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Next button */}
                    {selectedOption !== null && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        type="button"
                        onClick={handleNext}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black uppercase tracking-[0.12em] text-[12px]"
                        style={{
                          background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                          color: 'black',
                        }}
                      >
                        {currentIdx < total - 1 ? (
                          <>Next <ChevronRight className="w-4 h-4" /></>
                        ) : (
                          <>See Results <Trophy className="w-4 h-4" /></>
                        )}
                      </motion.button>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* RESULT */}
              {phase === 'result' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="py-4 space-y-6 text-center"
                >
                  {/* Score ring */}
                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                      className="relative w-28 h-28"
                    >
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                        <motion.circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke={passed ? '#00d4d4' : '#ef4444'}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct) }}
                          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                          style={{ filter: passed ? '0 0 12px rgba(0,212,212,0.7)' : '0 0 12px rgba(239,68,68,0.5)' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black" style={{ color: passed ? '#00d4d4' : '#ef4444' }}>
                          {score}/{total}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.15em]"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {Math.round(pct * 100)}%
                        </span>
                      </div>
                    </motion.div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black tracking-tight"
                        style={{ color: passed ? '#00d4d4' : 'rgba(255,255,255,0.9)' }}>
                        {passed ? 'Test Passed!' : 'Not Quite Yet'}
                      </h3>
                      <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {passed
                          ? `You scored ${Math.round(pct * 100)}% — skill unlocked!`
                          : `You need ${Math.round(PASS_THRESHOLD * 100)}% to unlock this skill. Keep practicing!`}
                      </p>
                    </div>
                  </div>

                  {/* Question review pills */}
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {answers.map((a, i) => {
                      const correct = a === questions[i]?.correct;
                      return (
                        <div key={i}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black"
                          style={{
                            background: correct ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
                            border: `1px solid ${correct ? 'rgba(52,211,153,0.35)' : 'rgba(239,68,68,0.35)'}`,
                            color: correct ? '#34d399' : '#ef4444',
                          }}>
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {passed ? (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        type="button"
                        onClick={() => { onPassed(score, total); handleClose(); }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black uppercase tracking-[0.12em] text-[12px]"
                        style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)', color: 'black' }}
                      >
                        <Trophy className="w-4 h-4" /> Unlock Skill
                      </motion.button>
                    ) : (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        type="button"
                        onClick={handleRetry}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black uppercase tracking-[0.12em] text-[12px]"
                        style={{ background: 'rgba(0,212,212,0.1)', border: '1px solid rgba(0,212,212,0.25)', color: '#00d4d4' }}
                      >
                        <RotateCcw className="w-4 h-4" /> Try Again
                      </motion.button>
                    )}
                    <button type="button" onClick={handleClose}
                      className="w-full py-2.5 text-[11px] font-black uppercase tracking-[0.15em]"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
