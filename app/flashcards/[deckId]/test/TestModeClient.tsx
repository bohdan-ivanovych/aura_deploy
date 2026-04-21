'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, Award } from 'lucide-react';
import Link from 'next/link';

type Question = {
  id: string;
  type: 'mcq' | 'tf';
  card: any;
  options?: string[];
  correctAnswer: true | false | string;
};

export default function TestModeClient({ deckId, deckTitle, cards: initialCards }: any) {
  // Generate Test Questions
  const questions: Question[] = useMemo(() => {
    let qs: Question[] = [];
    let shuffled = [...initialCards].sort(() => Math.random() - 0.5);
    
    shuffled.forEach(card => {
      const type = Math.random() > 0.5 ? 'mcq' : 'tf';
      
      if (type === 'mcq') {
        const distractors = initialCards
          .filter((c: any) => c.id !== card.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((c: any) => c.back);
        
        while (distractors.length < 3) distractors.push("Dummy " + Math.random().toString(36).substring(7));
        
        qs.push({
          id: card.id + '_mcq',
          type: 'mcq',
          card: card,
          correctAnswer: card.back,
          options: [...distractors, card.back].sort(() => Math.random() - 0.5)
        });
      } else {
        // True/False
        const isTrue = Math.random() > 0.5;
        const fakeBack = isTrue ? card.back : (initialCards.find((c: any) => c.id !== card.id)?.back || "Fake translation");
        
        qs.push({
          id: card.id + '_tf',
          type: 'tf',
          card: { ...card, displayBack: fakeBack },
          correctAnswer: isTrue
        });
      }
    });

    return qs;
  }, [initialCards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);

  const totalCards = questions.length;

  if (totalCards === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground font-bold">This deck has no cards.</p>
      </div>
    );
  }

  if (currentIndex >= totalCards) {
    const percentage = Math.round((score / totalCards) * 100);
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 bg-background text-center space-y-6">
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-32 h-32 rounded-full flex items-center justify-center border-4"
           style={{ 
             borderColor: percentage >= 80 ? '#00e676' : percentage >= 50 ? '#f59e0b' : '#ef4444',
             background: percentage >= 80 ? 'rgba(0,230,118,0.1)' : percentage >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
           }}
         >
           <h2 className="text-4xl font-black text-foreground">{percentage}%</h2>
         </motion.div>
         <div>
           <h2 className="text-3xl font-black text-foreground">Test Complete</h2>
           <p className="text-muted-foreground mt-2">You got {score} out of {totalCards} correct.</p>
         </div>
         <Link href={`/flashcards/${deckId}`}>
            <button className="px-6 py-3 rounded-full font-black text-foreground bg-white/5 border border-[var(--border)] transition active:scale-95 shadow-sm hover:bg-white/10">
              Return to Deck
            </button>
         </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const handleSelect = (answer: string | boolean) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQ.correctAnswer;
    if (isCorrect) setScore(prev => prev + 1);

    setTimeout(() => {
      setSelectedAnswer(null);
      setCurrentIndex(prev => prev + 1);
    }, 1500);
  };

  const progress = (currentIndex / totalCards) * 100;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="h-1 w-full bg-[var(--border)] overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#ec4899] to-[#8b5cf6]" 
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
        <div className="text-xs uppercase font-bold tracking-widest text-[#ec4899] border border-[#ec4899]/30 px-3 py-1 bg-[#ec4899]/10 rounded-full">
          Test Mode - Q{currentIndex + 1}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 max-w-2xl mx-auto w-full">
        
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[30vh]">
          {currentQ.type === 'tf' && (
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">True or False?</span>
          )}
          <h2 className="text-4xl md:text-5xl font-black text-center text-foreground leading-tight tracking-tight mb-4">
            {currentQ.card.front}
          </h2>
          
          {currentQ.type === 'tf' && (
            <div className="mt-8 p-6 rounded-2xl border-2 border-dashed border-[#ec4899]/50 bg-[#ec4899]/5">
              <p className="text-2xl font-bold text-center text-[#ec4899]">{currentQ.card.displayBack}</p>
            </div>
          )}
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
          {currentQ.type === 'mcq' ? currentQ.options!.map((option, idx) => {
            let stateClass = 'border-[var(--border)] bg-background text-foreground hover:bg-white/5 active:scale-95';
            
            if (selectedAnswer !== null) {
              if (option === currentQ.correctAnswer) {
                stateClass = 'border-[#00e676] bg-[#00e676]/20 text-[#00e676] scale-105 z-10';
              } else if (option === selectedAnswer) {
                stateClass = 'border-red-500 bg-red-500/20 text-red-500 opacity-60 scale-95';
              } else {
                stateClass = 'opacity-40 border-[var(--border)]';
              }
            }

            return (
              <button
                key={idx}
                disabled={selectedAnswer !== null}
                onClick={() => handleSelect(option)}
                className={`w-full py-5 px-6 rounded-2xl text-lg font-bold border-2 transition-all shadow-sm flex items-center justify-between ${stateClass}`}
              >
                <span className="truncate">{option}</span>
                {selectedAnswer !== null && option === currentQ.correctAnswer && <Check className="w-5 h-5" />}
                {selectedAnswer === option && option !== currentQ.correctAnswer && <X className="w-5 h-5" />}
              </button>
            );
          }) : (
            <>
              <button
                disabled={selectedAnswer !== null}
                onClick={() => handleSelect(true)}
                className={`w-full py-5 px-6 rounded-2xl text-xl font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2
                  ${selectedAnswer !== null ? 
                    (currentQ.correctAnswer === true ? 'border-[#00e676] bg-[#00e676]/20 text-[#00e676]' : (selectedAnswer === true ? 'border-red-500 bg-red-500/20 text-red-500' : 'opacity-40')) 
                    : 'border-[var(--border)] text-foreground hover:border-[#00e676]/50'}`}
              >
                True
              </button>
              <button
                disabled={selectedAnswer !== null}
                onClick={() => handleSelect(false)}
                className={`w-full py-5 px-6 rounded-2xl text-xl font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2
                  ${selectedAnswer !== null ? 
                    (currentQ.correctAnswer === false ? 'border-[#00e676] bg-[#00e676]/20 text-[#00e676]' : (selectedAnswer === false ? 'border-red-500 bg-red-500/20 text-red-500' : 'opacity-40')) 
                    : 'border-[var(--border)] text-foreground hover:border-red-500/50'}`}
              >
                False
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
