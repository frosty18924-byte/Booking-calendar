'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';

function readThemeState(): boolean {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  if (typeof window !== 'undefined') {
    const theme = localStorage.getItem('theme');
    return theme === 'dark'
      || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  return false;
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    setIsDark(readThemeState());

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isDark?: boolean }>;
      if (typeof customEvent.detail?.isDark === 'boolean') {
        setIsDark(customEvent.detail.isDark);
        return;
      }
      setIsDark(readThemeState());
    };

    const handleStorageChange = () => setIsDark(readThemeState());

    window.addEventListener('themeChange', handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: newDark } }));
  };

  if (!mounted) return null;

  return (
    <button 
      onClick={toggleTheme}
      className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl hover:opacity-80 transition-all text-lg sm:text-xl ${className}`}
      style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
      aria-label="Toggle theme"
    >
      {isDark ? <Icon name="sun" className="w-6 h-6" /> : <Icon name="moon" className="w-6 h-6" />}
    </button>
  );
}
