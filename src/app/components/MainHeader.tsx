'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
          <button onClick={() => router.push(backPath)} className="text-blue-600 dark:text-blue-400 font-bold text-sm sm:text-base">
            ← Back
          </button>
        )}
        <h1 className="text-lg sm:text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        {/* Restored your original button logic */}
        {!backPath && (
          <button 
            onClick={() => router.push('/admin')}
            className="bg-slate-900 dark:bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[9px] sm:text-sm whitespace-nowrap"
          >
            Admin Dashboard
          </button>
        )}
      </div>
    </header>
  );
}