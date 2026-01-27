'use client';

import { useState, useEffect } from 'react';
import CalendarPage from '@/app/page';
import AppSidebar from '@/app/components/AppSidebar';
import { supabase } from '@/lib/supabase';

export default function BookingCalendarPage() {
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
      <AppSidebar isDark={isDark} />
      <div className="lg:ml-20 relative">
        <CalendarPage />
      </div>
    </div>
  );
}
