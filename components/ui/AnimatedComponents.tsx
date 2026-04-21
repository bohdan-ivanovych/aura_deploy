import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  whileHover?: any;
  whileTap?: any;
  animate?: any;
  initial?: any;
  exit?: any;
  layout?: boolean;
}

const springOptions = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
};

export function GlassCard({
  children,
  className,
  onClick,
  whileHover,
  whileTap,
  animate,
  initial,
  exit,
  layout,
}: GlassCardProps) {
  const MotionComponent = layout ? motion.div : motion.div;

  return (
    <MotionComponent
      layout={layout}
      initial={initial}
      animate={animate}
      exit={exit}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={springOptions}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl bg-gradient-to-b from-gray-900/80 to-black/70 light:liquid-glass border border-white/10 light:border-[var(--border)] shadow-[0_26px_85px_rgba(0,0,0,0.75)] light:var(--shadow-lg) backdrop-blur-2xl light:backdrop-blur-[25px] p-4 overflow-hidden',
        className
      )}
    >
      {children}
    </MotionComponent>
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const baseClasses = 'font-semibold transition-all backdrop-blur-xl border';
  
  const variants = {
    primary: 'bg-blue-600/90 light:bg-[var(--accent-blue)] text-white light:text-white hover:bg-blue-500 light:hover:bg-[var(--accent-blue)]/90 shadow-[0_18px_45px_rgba(0,0,0,0.65)] light:var(--shadow-md)',
    secondary: 'text-white/70 light:text-[var(--foreground-muted)] hover:text-white light:hover:text-[var(--foreground)] bg-white/5 light:bg-[var(--surface)] hover:bg-white/10 light:hover:bg-[var(--surface-hover)] border border-white/10 light:border-[var(--border)] backdrop-blur-xl',
    ghost: 'text-white/70 light:text-[var(--foreground-muted)] hover:text-white light:hover:text-[var(--foreground)] hover:bg-white/10 light:hover:bg-[var(--surface-hover)] backdrop-blur-md',
  };

  const sizes = {
    sm: 'px-3 py-1.5 rounded-xl text-xs',
    md: 'px-3.5 py-2 rounded-xl text-sm',
    lg: 'px-4 py-2.5 rounded-2xl text-base',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  );
}
