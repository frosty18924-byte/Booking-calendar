'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import AddStaffModal from '@/app/components/AddStaffModal';
import DuplicateRemovalModal from '@/app/components/DuplicateRemovalModal';
import AtlasImportModal from '@/app/components/AtlasImportModal';

export default function DashboardPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showDuplicateRemoval, setShowDuplicateRemoval] = useState(false);
  const [showAtlasModal, setShowAtlasModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile?.password_needs_change) {
        router.push('/auth/change-password-required');
        return;
      }

      setUser(profile);
      setUserRole(profile?.role_tier || null);
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Training Portal
              </h1>
              <p className={`mt-1 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome, {user?.full_name || 'User'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Admin Section - Only show if user has admin permissions */}
        {hasPermission(userRole, 'STAFF_MANAGEMENT', 'canView') && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Admin
              </h2>
              <p className={`mt-2 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage staff and system settings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Add Staff Card */}
              <div
                onClick={() => setShowAddStaffModal(true)}
                className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="text-5xl mb-4">👥</div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Manage Staff
                </h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Create and manage staff accounts, assign them to locations
                </p>
                <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold">Open</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Clean Duplicates Card */}
              <div
                onClick={() => setShowDuplicateRemoval(true)}
                className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:border-red-500 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:border-red-500 hover:bg-red-50'
                }`}
              >
                <div className="text-5xl mb-4">🧹</div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Clean Duplicates
                </h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Remove duplicate staff entries and divider records
                </p>
                <div className="mt-6 flex items-center text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold">Open</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Atlas Sync Card */}
              <div
                onClick={() => setShowAtlasModal(true)}
                className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="text-5xl mb-4">📥</div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Atlas Sync
                </h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Import Careskills completion dates from Atlas Excel files
                </p>
                <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold">Open</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Archive & Restore Card */}
              <div
                onClick={() => router.push('/admin/archive')}
                className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:border-orange-500 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                }`}
              >
                <div className="text-5xl mb-4">🗂️</div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Archive & Restore
                </h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Recover deleted bookings, staff, and archived items.
                </p>
                <div className="mt-6 flex items-center text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold">Open</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Add Staff Modal */}
            {showAddStaffModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <AddStaffModal 
                    onClose={() => setShowAddStaffModal(false)}
                    onRefresh={() => {
                      // Keep modal open after save/update so users can continue editing.
                      // AddStaffModal already refreshes and clears its own form state.
                    }}
                  />
                </div>
              </div>
            )}

            {/* Clean Duplicates Modal */}
            {showDuplicateRemoval && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <DuplicateRemovalModal 
                    onClose={() => setShowDuplicateRemoval(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-8">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Select an App
          </h2>
          <p className={`mt-2 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Choose which application you'd like to access
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Training Matrix Card */}
          <div
            onClick={() => router.push('/training-matrix')}
            className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
              isDark
                ? 'bg-gray-800 border-gray-700 hover:border-purple-500 hover:bg-gray-750'
                : 'bg-white border-gray-200 hover:border-purple-500 hover:bg-purple-50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📊</div>
            </div>
            <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Training Matrix
            </h3>
            <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              View all staff training records, completion dates, and manage certification expiry dates across all locations.
            </p>
            <div className="mt-6 flex items-center text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              <span className="font-semibold">Open App</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Course Expiry Checker Card */}
          <div
            onClick={() => router.push('/apps/expiry-checker')}
            className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
              isDark
                ? 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📅</div>
            </div>
            <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Course Expiry Checker
            </h3>
            <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Track staff training certifications, expiry dates, and manage course compliance across your organization.
            </p>
            <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              <span className="font-semibold">Open App</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Booking Calendar Card */}
          <div
            onClick={() => router.push('/apps/booking-calendar')}
            className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
              isDark
                ? 'bg-gray-800 border-gray-700 hover:border-emerald-500 hover:bg-gray-750'
                : 'bg-white border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📆</div>
            </div>
            <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Booking Calendar
            </h3>
            <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Schedule training events, manage staff bookings, and track attendance for courses.
            </p>
            <div className="mt-6 flex items-center text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span className="font-semibold">Open App</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Atlas Import Modal */}
      {showAtlasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <AtlasImportModal 
              onClose={() => setShowAtlasModal(false)}
            />
            <div className="p-6 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
              <button
                onClick={() => setShowAtlasModal(false)}
                className={`w-full py-3 rounded-lg font-semibold transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
