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
    <header className="flex justify-between items-center mb-8 bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
      <div className="flex items-center gap-4">
        {backPath && (
          <button onClick={() => router.push(backPath)} className="text-blue-600 dark:text-blue-400 font-bold">
            ← Back
          </button>
        )}
        <h1 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
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
            className="bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            Admin Dashboard
          </button>
        )}
      </div>
    </header>
  );
}