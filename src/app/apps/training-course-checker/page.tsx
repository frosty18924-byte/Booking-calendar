'use client';

import { useEffect, useState } from 'react';
import TrainingCourseChecker from '@/app/components/TrainingCourseChecker';
import { supabase } from '@/lib/supabase';

export default function TrainingCourseCheckerPage() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    checkAuth();
    checkTheme();
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: any) => {
      setIsDark(event.detail.isDark);
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const checkTheme = (): void => {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  };

  const checkAuth = async (): Promise<void> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Auth error:', error);
      window.location.href = '/login';
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'dark' : ''}`}>
      <TrainingCourseChecker isDark={isDark} />
    </div>
  );
}
