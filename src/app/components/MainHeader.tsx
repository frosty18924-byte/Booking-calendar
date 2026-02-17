'use client';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UniformButton from './UniformButton';

export default function MainHeader({ title, backPath }: { title: string, backPath?: string }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Only check the class once when the component mounts
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        {backPath && (
          <UniformButton
            variant="secondary"
            className="text-blue-600 dark:text-blue-400 font-bold text-sm sm:text-base px-3 py-1"
            onClick={() => router.push(backPath)}
          >
            ← Back
          </UniformButton>
        )}
        <h1 className="text-lg sm:text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
        <UniformButton
          variant="icon"
          className="p-2.5 rounded-xl border"
          onClick={toggleTheme}
        >
          {isDark ? '☀️' : '🌙'}
        </UniformButton>
        {/* Restored your original button logic */}
        {!backPath && (
          <UniformButton
            variant="primary"
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[9px] sm:text-sm whitespace-nowrap"
            onClick={() => router.push('/admin')}
          >
            Admin Dashboard
          </UniformButton>
        )}
      </div>
    </header>
  );
}