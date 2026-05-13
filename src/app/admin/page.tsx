'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import CourseManagerModal from '@/app/components/CourseManagerModal';
import LocationManagerModal from '@/app/components/LocationManagerModal';
import ChecklistTemplateModal from '@/app/components/ChecklistTemplateModal';
import { debugLog } from '@/lib/debug';
import { hasPermission } from '@/lib/permissions';
import BackButton from '@/app/components/BackButton';
import UniformButton from '@/app/components/UniformButton';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false); // Start with false to avoid hydration
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showChecklistTemplateModal, setShowChecklistTemplateModal] = useState(false);

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

        const { data: profile } = await supabase
          .from('profiles')
          .select('role_tier')
          .eq('id', currentUser.id)
          .single();
        const role = profile?.role_tier || null;
        setUserRole(role);

        if (!hasPermission(role, 'ADMIN_DASHBOARD', 'canView')) {
          router.push('/apps/booking-calendar');
          return;
        }
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

  const isAdmin = (userRole || '').trim().toLowerCase() === 'admin';

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
        {/* Header row with back button and title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12 px-2 sm:px-4">
          <BackButton onClick={handleBack} />
          <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">Training Control Centre</h1>
          <div />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* ADMIN-ONLY MANAGEMENT */}
          {isAdmin && (
            <>
              {/* LOCATIONS MANAGEMENT */}
              <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-amber-500 transition-all cursor-pointer" onClick={() => setShowLocationModal(true)}>
                 <div className="text-2xl sm:text-3xl mb-2">📍</div>
                 <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Manage Venues</h3>
                 <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Add and manage training locations.</p>
                 <UniformButton
                   variant="primary"
                   size="sm"
                   className="w-full"
                   onClick={(e) => {
                     e.stopPropagation();
                     setShowLocationModal(true);
                   }}
                 >
                   🏢 Manage
                 </UniformButton>
              </div>

              {/* CATALOG MANAGEMENT */}
              <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-purple-500 transition-all cursor-pointer" onClick={() => setShowCourseModal(true)}>
                 <div className="text-2xl sm:text-3xl mb-2">📚</div>
                 <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Course Catalog</h3>
                 <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Create training types and set capacities.</p>
                 <UniformButton
                   variant="primary"
                   size="sm"
                   className="w-full"
                   onClick={(e) => {
                     e.stopPropagation();
                     setShowCourseModal(true);
                   }}
                 >
                   📖 Manage
                 </UniformButton>
              </div>
            </>
          )}

          {/* ANALYTICS SHORTCUT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-emerald-500 transition-all cursor-pointer" onClick={() => router.push('/analytics?from=/admin')}>
             <div className="text-2xl sm:text-3xl mb-2">📊</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Intelligence Hub</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">View your performance dashboard.</p>
             <UniformButton
              variant="primary"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/analytics?from=/admin');
              }}
             >
               📊 View
             </UniformButton>
          </div>

          {/* FEEDBACK RESULTS */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-blue-500 transition-all cursor-pointer" onClick={() => router.push('/feedback/results')}>
             <div className="text-2xl sm:text-3xl mb-2">⭐</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Feedback Results</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Analyse training course feedback from staff.</p>
             <UniformButton
              variant="primary"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/feedback/results');
              }}
             >
               ⭐ View Results
             </UniformButton>
          </div>

          {/* ADMIN-ONLY */}
          {isAdmin && (
            <>
              {/* CHECKLIST TEMPLATE */}
              <div
                style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-indigo-500 transition-all cursor-pointer"
                onClick={() => setShowChecklistTemplateModal(true)}
              >
                <div className="text-2xl sm:text-3xl mb-2">✅</div>
                <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Checklist Template</h3>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Add/remove booking checklist items.</p>
                <UniformButton
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChecklistTemplateModal(true);
                  }}
                >
                  ✅ Manage
                </UniformButton>
              </div>

              {/* AUTOMATION CONTROL */}
              <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 sm:p-4 rounded-lg border shadow-sm group hover:border-cyan-500 transition-all cursor-pointer" onClick={() => router.push('/automation-control')}>
                <div className="text-2xl sm:text-3xl mb-2">🤖</div>
                <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm sm:text-base font-bold mb-1">Automation Control</h3>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mb-2">Control internal feedback email automation system.</p>
                <UniformButton
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/automation-control');
                  }}
                >
                   🤖 Control Automation
                </UniformButton>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      {isAdmin && showCourseModal && <CourseManagerModal onClose={() => setShowCourseModal(false)} />}
      {isAdmin && showLocationModal && <LocationManagerModal onClose={() => setShowLocationModal(false)} />}
      {isAdmin && showChecklistTemplateModal && <ChecklistTemplateModal onClose={() => setShowChecklistTemplateModal(false)} />}
    </main>
  );
}
