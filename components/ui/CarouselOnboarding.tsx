import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, ArrowRight } from 'lucide-react';
import { SPRING } from '@/lib/motion';

const ONBOARDING_STEPS = [
  {
    id: 'goal',
    icon: <Target className="w-12 h-12 text-[var(--accent-fuchsia)]" />,
    title: 'Define Your Path',
    description: 'Set your English level and ultimate goals. Aura adapts to your pace, pushing you slightly beyond your comfort zone.',
    color: 'var(--accent-fuchsia)'
  },
  {
    id: 'persona',
    icon: <Brain className="w-12 h-12 text-[var(--accent-cyan)]" />,
    title: 'Meet Your Coach',
    description: 'Choose from elite AI linguists, roast masters, or supportive mentors. Your partner, your rules.',
    color: 'var(--accent-cyan)'
  },
  {
    id: 'chat',
    icon: <Sparkles className="w-12 h-12 text-[#00e676]" />,
    title: 'Dive into Immersion',
    description: 'Stop studying. Start living the language. Real-time feedback, adaptive flashcards, and live voice calls.',
    color: '#00e676'
  }
];

export function CarouselOnboarding({ onComplete }: { onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextStep = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const currentStep = ONBOARDING_STEPS[currentIndex];

  return (
    <div className="w-full flex justify-center items-center py-12 px-6">
      <div className="max-w-md w-full flex flex-col items-center">
        
        {/* Animated Icon Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: 15 }}
            transition={SPRING.SOFT}
            className="w-32 h-32 rounded-[40px] flex items-center justify-center liquid-glass-strong shadow-2xl mb-12"
            style={{ boxShadow: `0 20px 60px ${currentStep.color}40`, border: `1px solid ${currentStep.color}60` }}
          >
            {currentStep.icon}
          </motion.div>
        </AnimatePresence>

        {/* Text Content */}
        <div className="text-center h-32 mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={SPRING.SOFT}
            >
              <h2 className="text-3xl font-black mb-4 tracking-tight" style={{ color: currentStep.color, textShadow: `0 0 20px ${currentStep.color}50` }}>
                {currentStep.title}
              </h2>
              <p className="text-[var(--foreground-muted)] text-[15px] leading-relaxed max-w-[280px] mx-auto font-medium">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress & Controls */}
        <div className="w-full flex flex-col items-center gap-8">
          <div className="flex gap-2.5">
            {ONBOARDING_STEPS.map((_, idx) => (
              <motion.div
                key={idx}
                className="h-1.5 rounded-full"
                animate={{ 
                  width: idx === currentIndex ? 24 : 6,
                  backgroundColor: idx === currentIndex ? currentStep.color : 'var(--border)'
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={nextStep}
            className="w-full py-4 rounded-full font-black text-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
            style={{ 
              background: `linear-gradient(135deg, ${currentStep.color}, ${currentStep.color}dd)`,
              boxShadow: `0 10px 40px ${currentStep.color}60`
            }}
          >
            {currentIndex === ONBOARDING_STEPS.length - 1 ? 'Start Your Dive' : 'Continue'}
            {currentIndex === ONBOARDING_STEPS.length - 1 ? <Sparkles className="w-4 h-4 ml-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
