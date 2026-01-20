'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check local storage or browser preference on load
    const theme = localStorage.getItem('theme');
    const isDarkMode = theme === 'dark' || 
                       (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    console.log('Toggle clicked, newDark:', newDark);
    setIsDark(newDark);
    
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Dispatch custom event to notify other components
    console.log('Dispatching themeChange event with isDark:', newDark);
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: newDark } }));
  };

  if (!mounted) return null;

  return (
    <button 
      onClick={toggleTheme}
      className="p-3 rounded-2xl hover:opacity-80 transition-all text-xl"
      style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}