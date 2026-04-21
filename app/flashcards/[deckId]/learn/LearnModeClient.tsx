'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, Brain, Skull } from 'lucide-react';
import Link from 'next/link';
import { binaryReviewFlashcard } from '@/app/actions/flashcard';
import { haptics } from '@/lib/utils/haptics';
import confetti from 'canvas-confetti';

export default function LearnModeClient({ deckId, deckTitle, cards: initialCards }: any) {
  // Sort cards randomly, prioritize zombies (errorCount >= 3)
  const [learningCards, setLearningCards] = useState(() => {
    return [...initialCards].sort((a, b) => {
      if (a.errorCount >= 3 && b.errorCount < 3) return -1;
      if (b.errorCount >= 3 && a.errorCount < 3) return 1;
      return Math.random() - 0.5;
    });
  });
  const [knownCount, setKnownCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const isReviewingRef = useRef(false); // Synchronous guard against multi-click
  
  // Trimodal Mode: 'sniper' | 'judge' | 'fixer' | 'chat'
  const [currentMode, setCurrentMode] = useState<'sniper' | 'judge' | 'fixer' | 'chat'>('fixer');
  const [judgeIsCorrect, setJudgeIsCorrect] = useState<boolean>(true);

  const totalCards = initialCards.length;

  const currentCard = learningCards[currentIndex];
  const isZombie = currentCard && currentCard.errorCount >= 3;

  // Decide mode when card changes
  useEffect(() => {
    if (currentCard && currentCard.type === 'trimodal') {
      const modes: ('sniper' | 'judge' | 'fixer' | 'chat')[] = ['sniper', 'judge', 'fixer', 'chat'];
      setCurrentMode(modes[Math.floor(Math.random() * modes.length)]);
      setJudgeIsCorrect(Math.random() > 0.5);
    } else {
      setCurrentMode('fixer'); // fallback for legacy cards
    }
  }, [currentIndex, currentCard]);

  if (totalCards === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground font-bold">This deck has no cards.</p>
      </div>
    );
  }

  if (learningCards.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 bg-background text-center space-y-6">
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-24 h-24 rounded-full bg-[#00e676]/20 flex items-center justify-center border border-[#00e676]/30"
         >
           <Brain className="w-12 h-12 text-[#00e676]" />
         </motion.div>
         <div>
           <h2 className="text-3xl font-black text-foreground">You mastered this deck!</h2>
           <p className="text-muted-foreground mt-2">All words have been moved to your "known" memory.</p>
         </div>
         <Link href={`/flashcards/${deckId}`}>
            <button className="px-6 py-3 rounded-full font-black text-black bg-[#00e676] shadow-[0_4px_20px_rgba(0,230,118,0.3)] transition active:scale-95">
              Return to Deck
            </button>
         </Link>
      </div>
    );
  }

  const handleReview = async (correct: boolean) => {
    if (isReviewingRef.current) return; // Synchronous guard against rapid multi-click
    isReviewingRef.current = true;
    setIsCorrect(correct);
    if (correct) {
      haptics.success();
      if (isZombie) {
         confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      }
    } else {
      haptics.error();
    }

    try {
      await binaryReviewFlashcard(currentCard.id, correct);
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      setTypedAnswer('');
      setIsCorrect(null);
      isReviewingRef.current = false; // Release guard after transition

      if (correct) {
        // Move to known
        setKnownCount(prev => prev + 1);
        const newLearning = learningCards.filter((_, idx) => idx !== currentIndex);
        setLearningCards(newLearning);
        if (newLearning.length > 0) {
          setCurrentIndex(prev => prev % newLearning.length);
        }
      } else {
        // Keep in learning, move to next (or stay if it's a zombie, to force them to learn it)
        const nextIndex = isZombie ? currentIndex : (currentIndex + 1) % learningCards.length;
        setCurrentIndex(nextIndex);
        // If it's a zombie, re-roll the mode immediately so they don't just memorize the button
        if (isZombie && currentCard.type === 'trimodal') {
          const modes: ('sniper' | 'judge' | 'fixer' | 'chat')[] = ['sniper', 'judge', 'fixer', 'chat'];
          setCurrentMode(modes[Math.floor(Math.random() * modes.length)]);
          setJudgeIsCorrect(Math.random() > 0.5);
        }
      }
    }, 1500); // 1.5s visual feedback
  };

  const progress = (knownCount / totalCards) * 100;

  // --- Render Modals/UI based on mode ---
  const renderSniperMode = () => {
    const sentence = currentCard.mistakeSentence || currentCard.front;
    const words = sentence.split(/\s+/);
    const targetWord = currentCard.wrongWord || 'UNKNOWN';

    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[30vh]">
        <h3 className="text-sm uppercase tracking-[0.2em] font-black text-red-500/80 mb-6 flex items-center gap-2">
          🎯 Sniper Mode — Tap the wrong word
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {words.map((word: string, idx: number) => {
            const cleanWord = word.replace(/[.,!?]/g, '');
            const isTarget = cleanWord.toLowerCase() === targetWord.toLowerCase();
            
            let btnClass = "bg-[var(--border)]/20 border border-[var(--border)]/30 text-2xl md:text-4xl font-bold py-3 px-4 rounded-2xl transition-transform active:scale-90 shadow-sm";
            
            if (selectedAnswer !== null) {
              if (selectedAnswer === String(idx)) {
                btnClass = isCorrect 
                  ? "bg-[#00e676]/20 border-[#00e676] text-[#00e676] text-2xl md:text-4xl font-bold py-3 px-4 rounded-2xl scale-110 shadow-[0_0_20px_rgba(0,230,118,0.4)]"
                  : "bg-red-500/20 border-red-500 text-red-500 text-2xl md:text-4xl font-bold py-3 px-4 rounded-2xl scale-95 opacity-80";
              } else if (isTarget && isCorrect === false) {
                 // Reveal correct answer if they failed
                 btnClass = "bg-[#00e676]/20 border-[#00e676] text-[#00e676] text-2xl md:text-4xl font-bold py-3 px-4 rounded-2xl scale-105";
              } else {
                 btnClass = "bg-[var(--border)]/10 border-[var(--border)]/20 text-2xl md:text-4xl font-bold py-3 px-4 rounded-2xl opacity-40";
              }
            }

            return (
              <button 
                key={idx} 
                disabled={selectedAnswer !== null}
                onClick={() => {
                  setSelectedAnswer(String(idx));
                  handleReview(isTarget);
                }}
                className={btnClass}
              >
                {word}
              </button>
            )
          })}
        </div>
      </div>
    );
  };

  const renderJudgeMode = () => {
    const displaySentence = judgeIsCorrect ? (currentCard.correctSentence || currentCard.back) : (currentCard.mistakeSentence || currentCard.front);

    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center h-full">
         <h3 className="text-sm uppercase tracking-[0.2em] font-black text-amber-500/80 mb-6 flex items-center gap-2">
          ⚖️ The Judge — Is this correct?
        </h3>
        <h2 className="text-3xl md:text-5xl font-black text-center text-foreground leading-tight tracking-tight mb-12">
          "{displaySentence}"
        </h2>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-auto">
           <button
             disabled={selectedAnswer !== null}
             onClick={() => {
               setSelectedAnswer('correct');
               handleReview(judgeIsCorrect === true);
             }}
             className={`py-6 rounded-3xl font-black text-xl transition-all border-2 border-b-4 ${
               selectedAnswer !== null 
                 ? (judgeIsCorrect ? 'bg-[#00e676]/20 border-[#00e676] text-[#00e676]' : 'opacity-40 border-[var(--border)]') 
                 : 'bg-[var(--border)]/10 border-[var(--border)] hover:bg-[var(--border)]/30 active:translate-y-1 active:border-b-2'
             }`}
           >
             Correct
           </button>
           <button
             disabled={selectedAnswer !== null}
             onClick={() => {
               setSelectedAnswer('incorrect');
               handleReview(judgeIsCorrect === false);
             }}
             className={`py-6 rounded-3xl font-black text-xl transition-all border-2 border-b-4 ${
               selectedAnswer !== null 
                 ? (!judgeIsCorrect ? 'bg-red-500/20 border-red-500 text-red-500' : 'opacity-40 border-[var(--border)]') 
                 : 'bg-[var(--border)]/10 border-[var(--border)] hover:bg-[var(--border)]/30 active:translate-y-1 active:border-b-2'
             }`}
           >
             Incorrect
           </button>
        </div>
      </div>
    );
  };

  const renderFixerMode = () => {
     let mistakeSentence = currentCard.mistakeSentence || currentCard.front;
     const wrongWord = currentCard.wrongWord || '';
     if (wrongWord && mistakeSentence.includes(wrongWord)) {
        mistakeSentence = mistakeSentence.replace(wrongWord, '_____');
     }
     
     let distractor = currentCard.distractorWord;
     if (!distractor) {
       const safeCards = initialCards.filter((c: any) => (c.correctWord || c.back) !== (currentCard.correctWord || currentCard.back));
       distractor = safeCards.length > 0
         ? (safeCards[Math.floor(Math.random() * safeCards.length)].correctWord || safeCards[Math.floor(Math.random() * safeCards.length)].back)
         : 'something';
     }

     const options = Array.from(new Set([currentCard.correctWord || currentCard.back, wrongWord, distractor].filter(Boolean)));
     // Shuffle options deterministically for render but random initially (we'll just use simple shuffle)
     const shuffledSettings = [...options].sort((a,b) => a.localeCompare(b)); // Sort to keep them stable during render

     return (
       <div className="w-full flex-1 flex flex-col items-center justify-center">
         <h3 className="text-sm uppercase tracking-[0.2em] font-black text-indigo-500/80 mb-6 flex items-center gap-2">
          🔧 The Fixer — Choose the right word
        </h3>
         <h2 className="text-3xl md:text-5xl font-black text-center text-foreground leading-tight tracking-tight mb-12">
            {mistakeSentence}
         </h2>

         <div className="w-full flex flex-col gap-3 max-w-sm mt-auto">
           {shuffledSettings.map((opt, idx) => {
              const isTargetCorrect = opt === (currentCard.correctWord || currentCard.back);
              let btnClass = "bg-[var(--border)]/10 border-2 border-[var(--border)]/50 hover:bg-[var(--border)]/30 py-4 rounded-2xl font-black text-lg transition-transform active:scale-95";
              
              if (selectedAnswer !== null) {
                if (selectedAnswer === opt) {
                  btnClass = isCorrect 
                    ? "bg-[#00e676]/20 border-2 border-[#00e676] text-[#00e676] py-4 rounded-2xl font-black text-lg scale-105"
                    : "bg-red-500/20 border-2 border-red-500 text-red-500 py-4 rounded-2xl font-black text-lg scale-95 opacity-80";
                } else if (isTargetCorrect && isCorrect === false) {
                   btnClass = "bg-[#00e676]/20 border-2 border-[#00e676] text-[#00e676] py-4 rounded-2xl font-black text-lg scale-100";
                } else {
                  btnClass = "bg-[var(--border)]/5 border-2 border-[var(--border)]/10 py-4 rounded-2xl font-black text-lg opacity-40";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={selectedAnswer !== null}
                  onClick={() => {
                    setSelectedAnswer(opt);
                    handleReview(isTargetCorrect);
                  }}
                  className={btnClass}
                >
                  {opt}
                </button>
              )
           })}
         </div>
       </div>
     );
  };

  const renderChatMode = () => {
     let mistakeSentence = currentCard.mistakeSentence || currentCard.front;
     const wrongWord = currentCard.wrongWord || '';
     if (wrongWord && mistakeSentence.includes(wrongWord)) {
        mistakeSentence = mistakeSentence.replace(wrongWord, '_____');
     }
     
     const correctWord = currentCard.correctWord || currentCard.back;

     return (
       <div className="w-full flex-1 flex flex-col items-center justify-center">
         <h3 className="text-sm uppercase tracking-[0.2em] font-black text-cyan-500/80 mb-6 flex items-center gap-2">
          💬 Chat Mode — Fill in the blank
         </h3>
         
         {/* Fake Chat Bubble for Aura */}
         <div className="w-full max-w-sm mb-12 flex flex-col gap-2">
            <div className="flex gap-3 items-end">
               <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/30">
                  <span className="text-cyan-500 text-xs font-bold">AI</span>
               </div>
               <div className="bg-[var(--border)]/10 border border-[var(--border)]/20 rounded-2xl rounded-bl-sm p-4 text-left">
                  <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
                    {mistakeSentence}
                  </p>
               </div>
            </div>
         </div>

         {/* User Input Area */}
         <div className="w-full max-w-sm flex items-center gap-2 mt-auto">
            <input
               disabled={selectedAnswer !== null}
               type="text"
               value={typedAnswer}
               onChange={(e) => setTypedAnswer(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && typedAnswer.trim().length > 0 && selectedAnswer === null) {
                    setSelectedAnswer(typedAnswer);
                    handleReview(typedAnswer.trim().toLowerCase() === correctWord.trim().toLowerCase());
                 }
               }}
               placeholder="Type the missing word..."
               className={`flex-1 bg-[var(--border)]/10 border-2 rounded-full px-6 py-4 font-bold text-lg transition-all focus:outline-none ${
                 selectedAnswer !== null 
                  ? (isCorrect ? 'border-[#00e676] text-[#00e676] bg-[#00e676]/10' : 'border-red-500 text-red-500 bg-red-500/10')
                  : 'border-[var(--border)]/30 focus:border-cyan-500/50'
               }`}
            />
            <button
               disabled={selectedAnswer !== null || typedAnswer.trim().length === 0}
               onClick={() => {
                  setSelectedAnswer(typedAnswer);
                  handleReview(typedAnswer.trim().toLowerCase() === correctWord.trim().toLowerCase());
               }}
               className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  selectedAnswer !== null || typedAnswer.trim().length === 0
                   ? 'bg-[var(--border)]/20 text-muted-foreground opacity-50'
                   : 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95'
               }`}
            >
              <Check className="w-6 h-6" />
            </button>
         </div>

         {/* Show correct answer if failed */}
         <AnimatePresence>
            {selectedAnswer !== null && isCorrect === false && (
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="mt-6 text-center"
               >
                 <span className="text-xs uppercase tracking-widest text-[#00e676] font-bold">Right Answer:</span>
                 <p className="text-xl font-black text-[#00e676]">{correctWord}</p>
               </motion.div>
            )}
         </AnimatePresence>
       </div>
     );
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isZombie ? 'bg-red-950/20' : 'bg-background'}`}>
      <div className="h-1 w-full bg-[var(--border)] overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#00e676] to-[#00d4d4]" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      <header className="shrink-0 px-4 pt-4 md:px-8 flex items-center justify-between">
        <Link href={`/flashcards/${deckId}`}>
          <button className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border)] text-muted-foreground hover:bg-[var(--border)] transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          {isZombie && (
            <div className="text-xs uppercase font-black tracking-widest text-red-500 flex items-center gap-1.5 animate-pulse bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
              <Skull className="w-3.5 h-3.5" /> Zombie Slayer
            </div>
          )}
          <div className="text-xs uppercase font-bold tracking-widest text-[#00e676] border border-[#00e676]/30 px-3 py-1 bg-[#00e676]/10 rounded-full">
            Trimodal Engine
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-12 max-w-2xl mx-auto w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard.id}-${currentMode}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col"
          >
            {currentMode === 'sniper' && renderSniperMode()}
            {currentMode === 'judge' && renderJudgeMode()}
            {currentMode === 'fixer' && renderFixerMode()}
            {currentMode === 'chat' && renderChatMode()}

            <AnimatePresence>
               {selectedAnswer !== null && isCorrect === false && (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-8 bg-[var(--border)]/30 rounded-2xl p-4 border border-[var(--border)] w-full max-w-sm mx-auto text-center"
                 >
                   <p className="text-xs font-black uppercase text-red-400 mb-1 tracking-widest">Feedback</p>
                   <p className="text-sm font-medium text-foreground">
                     {currentCard.englishExplanation || "Review the correct sentence carefully!"}
                   </p>
                 </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
