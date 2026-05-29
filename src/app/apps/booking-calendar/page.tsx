'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CalendarPage from './CalendarPage';
import { supabase } from '@/lib/supabase';

export default function BookingCalendarPage() {
  const router = useRouter();
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
  }

  const checkAuth = async (): Promise<void> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'dark' : ''}`}>
      <div className="relative">
        <CalendarPage />
      </div>
    </div>
  );
}
