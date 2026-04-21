'use client';

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Plus } from 'lucide-react';

interface SlotComboboxProps {
  options: string[];
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  isDark: boolean;
  label?: string;
  id?: string;
}

export function SlotCombobox({
  options,
  placeholder = 'Type or select…',
  value,
  onChange,
  isDark,
  label,
  id = 'slot-combobox',
}: SlotComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      !value.includes(opt) &&
      opt.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || value.includes(trimmed)) return;
      onChange([...value, trimmed]);
      setInputValue('');
    },
    [value, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => onChange(value.filter((t) => t !== tag)),
    [value, onChange],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Design tokens
  const containerBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const containerBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const focusBorder     = isDark ? 'rgba(34,211,238,0.6)'   : 'rgba(8,145,178,0.5)';
  const dropdownBg      = isDark ? 'rgba(14,16,28,0.98)'    : 'rgba(255,255,255,0.98)';
  const dropdownBorder  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const optionHoverBg   = isDark ? 'rgba(34,211,238,0.08)'  : 'rgba(8,145,178,0.06)';
  const optionText      = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
  const mutedText       = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';
  const inputText       = isDark ? '#ffffff'                 : '#1D1D1F';
  const tagBg           = isDark ? 'rgba(34,211,238,0.15)'  : 'rgba(8,145,178,0.10)';
  const tagBorder       = isDark ? 'rgba(34,211,238,0.4)'   : 'rgba(8,145,178,0.3)';
  const tagText         = isDark ? '#22d3ee'                 : '#0891b2';
  const accentCyan      = isDark ? '#22d3ee'                 : '#0891b2';

  const showCustomAdd =
    inputValue.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === inputValue.toLowerCase()) &&
    !value.includes(inputValue.trim());

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-1.5"
          style={{ color: mutedText }}
        >
          {label}
        </label>
      )}

      {/* Input container */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-owns={`${id}-listbox`}
        className="flex flex-wrap items-center gap-1.5 min-h-[44px] w-full rounded-2xl px-3 py-2 cursor-text transition-all duration-150"
        style={{
          background: containerBg,
          border: `1px solid ${isOpen ? focusBorder : containerBorder}`,
          boxShadow: isOpen ? `0 0 0 3px ${isDark ? 'rgba(34,211,238,0.1)' : 'rgba(8,145,178,0.08)'}` : 'none',
        }}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* Selected tags */}
        <AnimatePresence>
          {value.map((tag) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: tagBg, border: `1px solid ${tagBorder}`, color: tagText }}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="rounded-full hover:opacity-60 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Text input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          aria-label={label ?? placeholder}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-[rgba(255,255,255,0.25)]"
          style={{ color: inputText, fontSize: '14px' }}
          autoComplete="off"
        />

        {/* Chevron toggle */}
        <button
          type="button"
          aria-label="Toggle dropdown"
          onClick={(e) => { e.stopPropagation(); setIsOpen((o) => !o); }}
          className="ml-auto shrink-0 transition-transform duration-200"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: mutedText,
          }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (filteredOptions.length > 0 || showCustomAdd) && (
          <motion.ul
            id={`${id}-listbox`}
            role="listbox"
            aria-label={`${label ?? 'Options'} list`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50 max-h-52 overflow-y-auto no-scrollbar"
            style={{
              background: dropdownBg,
              border: `1px solid ${dropdownBorder}`,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              boxShadow: isDark
                ? '0 20px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            {/* Predefined options */}
            {filteredOptions.map((opt) => (
              <li key={opt} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTag(opt); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium transition-colors duration-100"
                  style={{ color: optionText }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = optionHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}

            {/* "Add custom" row */}
            {showCustomAdd && (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTag(inputValue); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] font-semibold transition-colors duration-100"
                  style={{ color: accentCyan }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = optionHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Add &ldquo;{inputValue.trim()}&rdquo;
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Helper hint */}
      {value.length === 0 && (
        <p className="mt-1.5 text-[10px]" style={{ color: mutedText }}>
          Select from list or type &amp; press Enter to add your own
        </p>
      )}
    </div>
  );
}
