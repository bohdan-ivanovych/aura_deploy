'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface TappableProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  as?: 'div' | 'button' | 'span';
  scaleAmount?: number;
  disabled?: boolean;
}

export function Tappable({
  children,
  as = 'div',
  scaleAmount = 0.97,
  disabled = false,
  className = '',
  ...props
}: TappableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionEl = (as === 'button' ? motion.button : as === 'span' ? motion.span : motion.div) as any;

  return (
    <MotionEl
      whileTap={disabled ? undefined : { scale: scaleAmount }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={`touch-manipulation select-none cursor-pointer ${className}`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...props.style,
      }}
      {...props}
    >
      {children}
    </MotionEl>
  );
}
