'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SavePhraseModal } from './SavePhraseModal';

interface SelectableTextProps {
  children: string;
  context?: string;
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 25 };

export function SelectableText({ children, context }: SelectableTextProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string>('');

  // Split text into words and preserve spacing
  const words = children.split(/(\s+)/);

  const handleWordClick = (word: string) => {
    // Clean the word - remove punctuation and check if it's valid
    const cleanWord = word.replace(/[^\w]/g, '');
    if (cleanWord.length >= 2 && cleanWord.length <= 120) {
      setSelectedWord(cleanWord);
      setModalOpen(true);
    }
  };

  return (
    <>
      <span className="select-text">
        {words.map((word, index) => {
          // Check if this is actually a word (not just whitespace)
          const isWord = /\w/.test(word);
          const cleanWord = word.replace(/[^\w]/g, '');
          const isValidWord = isWord && cleanWord.length >= 2 && cleanWord.length <= 120;
          
          return (
            <span key={index}>
              {isWord ? (
                <motion.span
                  className="relative cursor-pointer inline-block group"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  transition={spring}
                  onClick={() => handleWordClick(word)}
                >
                  <span className="relative z-10 px-1 rounded-md transition-colors duration-300 group-hover:bg-[var(--accent-cyan)]/10 group-hover:text-[var(--accent-cyan)]">
                    {word}
                  </span>
                </motion.span>
              ) : (
                // Preserve whitespace exactly as in original
                <span>{word}</span>
              )}
            </span>
          );
        })}
      </span>

      <SavePhraseModal
        phrase={selectedWord}
        contextSentence={context || ''}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedWord('');
          }
        }}
      />
    </>
  );
}
