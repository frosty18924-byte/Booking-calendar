'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/app/components/ThemeToggle';
import AddStaffModal from '@/app/components/AddStaffModal';
import CourseManagerModal from '@/app/components/CourseManagerModal';
import LocationManagerModal from '@/app/components/LocationManagerModal';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    checkAuth();
    checkTheme();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const handleThemeChange = (event: any) => {
      console.log('Theme change detected:', event.detail.isDark);
      setIsDark(event.detail.isDark);
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  function checkTheme() {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  }

  async function checkAuth() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    } catch (err) {
      console.error("Error checking auth:", err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  }

  if (loading) {
    return (
      <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="p-8 transition-colors duration-300 flex items-center justify-center">
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="transition-colors duration-300 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* User info and sign out bar */}
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="text-sm font-semibold" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
            {user ? `Logged in as: ${user.email}` : 'Not logged in'}
          </div>
          {user && (
            <button 
              onClick={handleSignOut} 
              style={{ backgroundColor: '#dc2626' }} 
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'} 
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'} 
              className="text-white px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Header row with back button, title, and dark mode toggle */}
        <div className="flex justify-between items-center mb-12 px-4">
          <button 
            onClick={() => router.push('/')}
            style={{ color: isDark ? '#94a3b8' : '#475569' }}
            className="p-2 hover:opacity-80 rounded-lg font-bold text-2xl"
          >
            ←
          </button>
          <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-3xl font-black uppercase tracking-tighter">Admin Control Centre</h1>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* STAFF MANAGEMENT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 rounded-3xl border shadow-sm group hover:border-blue-500 transition-all cursor-pointer" onClick={() => setShowStaffModal(true)}>
             <div className="text-6xl mb-4">👥</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold mb-2">Staff Roster</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mb-6">Manage employee profiles and site permissions.</p>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setShowStaffModal(true);
               }}
               style={{ backgroundColor: '#2563eb' }} 
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'} 
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} 
               className="w-full py-3 text-white font-bold rounded-xl transition-all"
             >
               Open Staffing
             </button>
          </div>

          {/* LOCATIONS MANAGEMENT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 rounded-3xl border shadow-sm group hover:border-amber-500 transition-all cursor-pointer" onClick={() => setShowLocationModal(true)}>
             <div className="text-6xl mb-4">📍</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold mb-2">Manage Venues</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mb-6">Add and manage training locations.</p>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setShowLocationModal(true);
               }}
               style={{ backgroundColor: '#f59e0b' }} 
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'} 
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'} 
               className="w-full py-3 text-white font-bold rounded-xl transition-all"
             >
               Open Venues
             </button>
          </div>

          {/* CATALOG MANAGEMENT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 rounded-3xl border shadow-sm group hover:border-purple-500 transition-all cursor-pointer" onClick={() => setShowCourseModal(true)}>
             <div className="text-6xl mb-4">📚</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold mb-2">Course Catalog</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mb-6">Create training types and set capacities.</p>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setShowCourseModal(true);
               }}
               style={{ backgroundColor: '#a855f7' }} 
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9333ea'} 
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#a855f7'} 
               className="w-full py-3 text-white font-bold rounded-xl transition-all"
             >
               Open Catalog
             </button>
          </div>

          {/* ANALYTICS SHORTCUT */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 rounded-3xl border shadow-sm group hover:border-emerald-500 transition-all cursor-pointer" onClick={() => router.push('/analytics')}>
             <div className="text-6xl mb-4">📊</div>
             <h3 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold mb-2">Intelligence Hub</h3>
             <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mb-6">View your historical performance dashboard.</p>
             <button 
              onClick={(e) => {
                e.stopPropagation();
                router.push('/analytics');
              }}
              style={{ backgroundColor: '#10b981' }} 
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'} 
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'} 
              className="w-full py-3 text-white font-bold rounded-xl transition-all"
             >
               View Dashboard
             </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showStaffModal && <AddStaffModal onClose={() => setShowStaffModal(false)} onRefresh={() => {}} />}
      {showCourseModal && <CourseManagerModal onClose={() => setShowCourseModal(false)} />}
      {showLocationModal && <LocationManagerModal onClose={() => setShowLocationModal(false)} />}
    </main>
  );
}