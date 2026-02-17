// A uniform button for all apps/pages
'use client';
import React from 'react';

interface UniformButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  className?: string;
}

const base =
  'inline-flex items-center justify-center font-sans font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed';

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
  className = '',
  ...props
}: UniformButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} px-4 py-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
