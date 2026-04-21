import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoadingSkeleton({ className = '', children }: LoadingSkeletonProps) {
  return (
    <div 
      className={`apple-button loading-pulse ${className}`}
      role="status"
      aria-label="Loading content"
    >
      {children || (
        <div className="h-4 bg-[var(--surface-hover)] rounded animate-pulse" />
      )}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div 
      className={`apple-button ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-full h-full rounded-full border-2 border-[var(--border)] border-t-transparent border-r-[var(--accent-cyan)]"
      >
        <div className="w-full h-full rounded-full border-2 border-[var(--border)] border-b-[var(--accent-cyan)] border-l-transparent" />
      </motion.div>
    </div>
  );
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  loading = 'lazy',
  priority = false 
}: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={`gpu-accelerated ${className}`}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
      {...(priority && { fetchPriority: 'high' })}
    />
  );
}

interface SmoothScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function SmoothScroll({ children, className = '' }: SmoothScrollProps) {
  return (
    <div className={`smooth-scroll scrollbar-thin ${className}`}>
      {children}
    </div>
  );
}
