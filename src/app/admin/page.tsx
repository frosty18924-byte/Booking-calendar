'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import CourseManagerModal from '@/app/components/CourseManagerModal';
import LocationManagerModal from '@/app/components/LocationManagerModal';
import { debugLog } from '@/lib/debug';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false); // Start with false to avoid hydration
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    checkTheme();
    const runAuthCheck = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);
      } catch (err) {
        console.error('Error checking auth:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    runAuthCheck();
  }, [router]);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, [isDark]);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const handleThemeChange = (event: Event) => {
        const themeEvent = event as CustomEvent<{ isDark: boolean }>;
        debugLog('Theme change detected:', themeEvent.detail.isDark);
        setIsDark(themeEvent.detail.isDark);
      };
      
      window.addEventListener('themeChange', handleThemeChange);
      return () => window.removeEventListener('themeChange', handleThemeChange);
    }
  }, []);

  const checkTheme = (): void => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  };

  const handleBack = (): void => {
    router.push('/apps/booking-calendar');
  };

  if (loading) {
    return (
      <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="p-8 transition-colors duration-300 flex items-center justify-center">
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="transition-colors duration-300 p-3 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* User info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 px-2 sm:px-4">
          <div className="text-xs sm:text-sm font-semibold" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
            {user ? `Logged in as: ${user.email}` : 'Not logged in'}
          </div>
        </div>

        {/* Header row with back button and title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12 px-2 sm:px-4">
          <button 
            onClick={handleBack}
            style={{ color: isDark ? '#94a3b8' : '#475569' }}
            className="p-2 hover:opacity-80 rounded-lg font-bold text-xl sm:text-2xl"
          >
            ←
          </button>
          <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">Training Control Centre</h1>
          <div />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* LOCATIONS MANAGEMENT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-amber-500 transition-all cursor-pointer" onClick={() => setShowLocationModal(true)}>
             <div className="text-2xl sm:text-3xl mb-2">📍</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Manage Venues</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Add and manage training locations.</p>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setShowLocationModal(true);
               }}
               style={{ backgroundColor: '#f59e0b' }} 
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'} 
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'} 
               className="w-full py-1 sm:py-1.5 text-white font-bold rounded text-xs hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
             >
               🏢 Manage
             </button>
          </div>

          {/* CATALOG MANAGEMENT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-purple-500 transition-all cursor-pointer" onClick={() => setShowCourseModal(true)}>
             <div className="text-2xl sm:text-3xl mb-2">📚</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Course Catalog</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Create training types and set capacities.</p>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setShowCourseModal(true);
               }}
               style={{ backgroundColor: '#a855f7' }} 
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9333ea'} 
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#a855f7'} 
               className="w-full py-1 sm:py-1.5 text-white font-bold rounded text-xs hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
             >
               📖 Manage
             </button>
          </div>

          {/* ANALYTICS SHORTCUT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-emerald-500 transition-all cursor-pointer" onClick={() => router.push('/analytics?from=/admin')}>
             <div className="text-2xl sm:text-3xl mb-2">📊</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Intelligence Hub</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">View your performance dashboard.</p>
             <button
              onClick={(e) => {
                e.stopPropagation();
                router.push('/analytics?from=/admin');
              }}
              style={{ backgroundColor: '#10b981' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
              className="w-full py-1 sm:py-1.5 text-white font-bold rounded text-xs hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
             >
               📊 View
             </button>
          </div>

          {/* FEEDBACK RESULTS */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-blue-500 transition-all cursor-pointer" onClick={() => router.push('/feedback/results')}>
             <div className="text-2xl sm:text-3xl mb-2">⭐</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Feedback Results</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Analyse training course feedback from staff.</p>
             <button
              onClick={(e) => {
                e.stopPropagation();
                router.push('/feedback/results');
              }}
              style={{ backgroundColor: '#3b82f6' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              className="w-full py-1 sm:py-1.5 text-white font-bold rounded text-xs hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
             >
               ⭐ View Results
             </button>
          </div>

          {/* FEEDBACK EMAIL TRIGGER */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-orange-500 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl mb-2">📧</div>
            <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Send Feedback Emails</h3>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Trigger feedback emails for events ending in 30 minutes.</p>
            <button
              onClick={() => router.push('/api/schedule-feedback-emails')}
              style={{ backgroundColor: '#f97316' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
              className="w-full py-1 sm:py-1.5 text-white font-bold rounded text-xs hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
            >
               📧 Send Now
            </button>
          </div>

          {/* AUTOMATION CONTROL */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-cyan-500 transition-all cursor-pointer" onClick={() => router.push('/automation-control')}>
            <div className="text-2xl sm:text-3xl mb-2">🤖</div>
            <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Automation Control</h3>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Control internal feedback email automation system.</p>
            <button
              onClick={() => router.push('/automation-control')}
              style={{ backgroundColor: '#06b6d4' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0891b2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06b6d4'}
              className="w-full py-1 sm:py-1.5 text-white font-bold rounded text-xs hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
            >
               🤖 Control Automation
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showCourseModal && <CourseManagerModal onClose={() => setShowCourseModal(false)} />}
      {showLocationModal && <LocationManagerModal onClose={() => setShowLocationModal(false)} />}
    </main>
  );
}
