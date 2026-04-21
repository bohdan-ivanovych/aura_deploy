'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, XCircle, Zap, BookOpen, RefreshCw } from 'lucide-react';
import { useStats } from '@/lib/contexts/stats-context';
import { haptics } from '@/lib/utils/haptics';

interface RecoveryModeProps {
  isVisible: boolean;
  variant?: 'mobile' | 'desktop';
}

function RecoveryCard({ onClose }: { onClose: () => void }) {
  const { refetch } = useStats();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  // Track correct answers submitted so far (in order)
  const [submittedAnswers, setSubmittedAnswers] = useState<Array<{ mode: string; answer: unknown }>>([]);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);

  const fetchChallenges = useCallback(() => {
    setLoadingQuestions(true);
    fetch('/api/recovery')
      .then(r => r.json())
      .then(data => {
        if (data.questions) setQuestions(data.questions);
        if (data.token) setToken(data.token);
        setLoadingQuestions(false);
      })
      .catch(() => setLoadingQuestions(false));
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const challenge = questions[currentIndex];

  const handleReview = useCallback(async (correct: boolean, submittedAnswer: unknown) => {
    if (selectedAnswer !== null) return;
    setIsCorrect(correct);
    if (correct) haptics.medium(); else haptics.error();

    if (correct) {
      const challenge = questions[currentIndex];
      const newSubmitted = [
        ...submittedAnswers,
        { mode: challenge.mode as string, answer: submittedAnswer },
      ];
      setSubmittedAnswers(newSubmitted);

      if (currentIndex < questions.length - 1) {
        setTimeout(() => {
          setSelectedAnswer(null);
          setIsCorrect(null);
          setCurrentIndex(i => i + 1);
        }, 1200);
      } else {
        setRestoring(true);
        try {
          haptics.heavy();
          if (typeof window !== 'undefined') {
            import('canvas-confetti').then((confetti) => {
              confetti.default({ particleCount: 150, spread: 80, origin: { y: 0.8 }, colors: ['#4ade80', '#22c55e'] });
            });
          }
          const res = await fetch('/api/recovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send the signed token + all submitted correct answers for server validation
            body: JSON.stringify({ token, answers: newSubmitted }),
          });
          const result = await res.json();
          if (result.restored) {
            setRestored(true);
            await refetch();
            setTimeout(onClose, 2000);
          } else {
            // Server rejected — restart cleanly with a fresh challenge
            console.warn('[recovery] Server rejected answers:', result.error);
            setRestoring(false);
            fetchChallenges();
            setCurrentIndex(0);
            setSubmittedAnswers([]);
            setSelectedAnswer(null);
            setIsCorrect(null);
          }
        } catch {
          setRestoring(false);
        }
      }
    }
  }, [currentIndex, questions, submittedAnswers, selectedAnswer, token, refetch, onClose, fetchChallenges]);

  const handleRestart = () => {
    // Refetch a fresh challenge set (new token) so the user can't reuse the old one
    fetchChallenges();
    setCurrentIndex(0);
    setSubmittedAnswers([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  if (loadingQuestions) {
    return (
      <div className="mx-4 w-full max-w-md rounded-[28px] p-8 flex flex-col items-center justify-center"
           style={{ background: 'rgba(8,8,16,0.97)', border: '1px solid rgba(239,68,68,0.35)', backdropFilter: 'blur(32px)' }}>
        <Zap className="w-8 h-8 animate-spin text-red-500 mb-4" />
        <p className="text-white font-bold text-sm">Gathering adrenaline loop...</p>
      </div>
    );
  }
  if (!challenge) return null;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="mx-4 w-full max-w-md rounded-[28px] p-6 flex flex-col gap-5"
      style={{
        background: 'rgba(8,8,16,0.97)',
        border: '1px solid rgba(239,68,68,0.35)',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 0 80px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.8)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <motion.div
          animate={restored ? { scale: [1, 1.3, 1] } : { opacity: [1, 0.4, 1] }}
          transition={{ duration: restored ? 0.4 : 1.2, repeat: restored ? 0 : Infinity }}
          className="text-3xl"
        >
          {restored ? '💚' : '♥️'}
        </motion.div>
        {restored ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-1"
          >
            <p className="text-base font-black text-white">HP Fully Restored!</p>
            <p className="text-xs text-green-400">Adrenaline Loop Passed</p>
          </motion.div>
        ) : (
          <>
            <p className="text-[9px] font-black uppercase tracking-[0.35em]"
              style={{ color: 'rgba(239,68,68,0.7)' }}>
              Recovery Challenge {currentIndex + 1}/{questions.length}
            </p>
            <h3 className="text-sm font-black text-white">
              Answer 3 correctly to restore HP
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <BookOpen className="w-3 h-3" style={{ color: 'rgba(239,68,68,0.7)' }} />
              <span className="text-[9px] font-bold"
                style={{ color: 'rgba(239,68,68,0.7)' }}>{challenge.rule}</span>
            </div>
          </>
        )}
      </div>

      {!restored && (
        <>
          {/* Modes */}
          {challenge.mode === 'sniper' && (
             <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase text-red-500/80 tracking-widest text-center">🎯 Sniper Mode — Tap wrong word</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                   {challenge.mistakeSentence.split(/\s+/).map((word: string, idx: number) => {
                     const cleanWord = word.replace(/[.,!?]/g, '');
                     const isTarget = cleanWord.toLowerCase() === challenge.wrongWord.toLowerCase();
                     
                     let btnClass = "bg-white/5 border border-white/10 text-white text-lg font-bold py-2 px-3 rounded-lg";
                     if (selectedAnswer !== null) {
                        if (selectedAnswer === String(idx)) {
                           btnClass = isCorrect ? "bg-green-500 text-white text-lg font-bold py-2 px-3 rounded-lg scale-110" : "bg-red-500 text-white text-lg font-bold py-2 px-3 rounded-lg";
                        } else if (isTarget && isCorrect === false) {
                           btnClass = "bg-green-500/50 text-white text-lg font-bold py-2 px-3 rounded-lg";
                        } else {
                           btnClass = "bg-white/5 border border-white/10 text-white/40 text-lg font-bold py-2 px-3 rounded-lg";
                        }
                     }

                     return (
                       <button
                         key={idx}
                         disabled={selectedAnswer !== null}
                         onClick={() => {
                           setSelectedAnswer(String(idx));
                           handleReview(isTarget, cleanWord);
                         }}
                         className={btnClass}
                       >
                         {word}
                       </button>
                     )
                   })}
                </div>
             </div>
          )}

          {challenge.mode === 'judge' && (
             <div className="flex flex-col gap-4 items-center">
                 <p className="text-xs font-bold uppercase text-amber-500/80 tracking-widest text-center">⚖️ The Judge — Is this correct?</p>
                 <h2 className="text-xl font-bold text-white text-center">"{challenge.judgeIsCorrect ? challenge.correctSentence : challenge.mistakeSentence}"</h2>
                 <div className="grid grid-cols-2 gap-2 w-full mt-4">
                     <button
                       disabled={selectedAnswer !== null}
                       onClick={() => { setSelectedAnswer('correct'); handleReview(challenge.judgeIsCorrect === true, true); }}
                       className={`py-3 rounded-xl font-black text-sm border-2 ${selectedAnswer !== null ? (challenge.judgeIsCorrect ? 'bg-green-500/20 border-green-500 text-green-500' : 'opacity-40') : 'bg-white/10 border-white/20 text-white'}`}
                     >Correct</button>
                     <button
                       disabled={selectedAnswer !== null}
                       onClick={() => { setSelectedAnswer('incorrect'); handleReview(challenge.judgeIsCorrect === false, false); }}
                       className={`py-3 rounded-xl font-black text-sm border-2 ${selectedAnswer !== null ? (!challenge.judgeIsCorrect ? 'bg-red-500/20 border-red-500 text-red-500' : 'opacity-40') : 'bg-white/10 border-white/20 text-white'}`}
                     >Incorrect</button>
                 </div>
             </div>
          )}

          {challenge.mode === 'fixer' && (() => {
             let ms = challenge.mistakeSentence;
             if (challenge.wrongWord && ms.includes(challenge.wrongWord)) {
               ms = ms.replace(challenge.wrongWord, '_____');
             }
             const opts = [challenge.correctWord, challenge.wrongWord, challenge.distractorWord].filter(Boolean).sort((a,b) => a.localeCompare(b));

             return (
               <div className="flex flex-col gap-4 items-center">
                   <p className="text-xs font-bold uppercase text-indigo-500/80 tracking-widest text-center">🔧 The Fixer — Fill in the blank</p>
                   <h2 className="text-xl font-bold text-white text-center">{ms}</h2>
                   <div className="flex flex-col gap-2 w-full mt-2">
                      {opts.map((opt, idx) => {
                         const isTarget = opt === challenge.correctWord;
                         let btnClass = "py-3 rounded-xl font-bold text-sm border bg-white/10 border-white/20 text-white text-center";
                         if (selectedAnswer !== null) {
                            if (selectedAnswer === opt) {
                               btnClass = isCorrect ? "py-3 rounded-xl border bg-green-500/30 border-green-500 text-green-400 font-bold text-sm text-center" : "py-3 rounded-xl border bg-red-500/30 border-red-500 text-red-400 font-bold text-sm text-center";
                            } else if (isTarget && isCorrect === false) {
                               btnClass = "py-3 rounded-xl border bg-green-500/30 border-green-500 text-green-400 font-bold text-sm text-center";
                            } else {
                               btnClass = "py-3 rounded-xl border bg-white/5 border-white/10 text-white/40 font-bold text-sm text-center";
                            }
                         }

                         return (
                           <button
                             key={idx}
                             disabled={selectedAnswer !== null}
                             onClick={() => { setSelectedAnswer(opt); handleReview(isTarget, opt); }}
                             className={btnClass}
                           >
                             {opt}
                           </button>
                         )
                      })}
                   </div>
               </div>
             )
          })()}

          {/* Feedback & Reset */}
          <AnimatePresence>
            {selectedAnswer !== null && !isCorrect && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 mt-4"
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: '#f87171' }}>
                  <XCircle className="w-4 h-4" />
                  Loop failed! You must be perfect.
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRestart}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{
                    background: 'rgba(248,113,113,0.12)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    color: '#f87171',
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Restart Adrenaline Loop
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          {restoring && <p className="text-center text-xs text-white/50 animate-pulse mt-4"><Zap className="w-3 h-3 inline mr-1" /> Restoring HP...</p>}
        </>
      )}
    </motion.div>
  );
}

export function HPDepletionLock({ isVisible }: RecoveryModeProps) {
  const [challengeKey, setChallengeKey] = useState(0);
  const { refetch } = useStats();

  const handleClose = useCallback(async () => {
    await refetch();
    setChallengeKey(k => k + 1);
  }, [refetch]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="recovery-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[9999] flex items-end justify-center pb-6 backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'all' }}
        >
          <RecoveryCard key={challengeKey} onClose={handleClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
