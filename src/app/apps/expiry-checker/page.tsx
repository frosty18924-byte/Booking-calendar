'use client';

import { useState, useEffect } from 'react';
import CourseExpiryChecker from '@/app/components/CourseExpiryChecker';
import HomeButton from '@/app/components/HomeButton';
import { supabase } from '@/lib/supabase';

export default function ExpiryCheckerPage() {
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

  function checkTheme() {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Auth error:', error);
      window.location.href = '/login';
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'dark' : ''}`}>
      <HomeButton isDark={isDark} />
      <CourseExpiryChecker isDark={isDark} />
    </div>
  );
}
