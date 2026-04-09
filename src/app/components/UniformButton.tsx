// A uniform button for all apps/pages
'use client';
import React from 'react';

interface UniformButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const base =
  'inline-flex items-center justify-center font-sans font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed';

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
} as const;

const iconSizes = {
  sm: 'p-2',
  md: 'p-2.5',
  lg: 'p-3',
} as const;

const variants = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700',
  secondary:
    'bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:active:bg-slate-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  icon:
    'bg-transparent text-inherit p-1 hover:bg-slate-100 dark:hover:bg-slate-800',
};

export default function UniformButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: UniformButtonProps) {
  const padding = variant === 'icon' ? iconSizes[size] : sizes[size];
  return (
    <button
      className={`${base} ${variants[variant]} ${padding} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
