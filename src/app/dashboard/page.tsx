'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { loadEmailTestSettings, saveEmailTestSettings } from '@/lib/emailTestMode';
import ThemeToggle from '@/app/components/ThemeToggle';
import AddStaffModal from '@/app/components/AddStaffModal';
import DuplicateRemovalModal from '@/app/components/DuplicateRemovalModal';
import AtlasImportModal from '@/app/components/AtlasImportModal';

interface EmailLogItem {
  id: string;
  created_at: string;
  subject: string;
  status: 'sent' | 'failed';
  test_mode: boolean;
  provider: string | null;
  message_id: string | null;
  error_text: string | null;
  original_recipients: string[];
  delivered_recipients: string[];
}

interface DashboardProfile {
  full_name: string | null;
  role_tier: string | null;
  password_needs_change?: boolean | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showDuplicateRemoval, setShowDuplicateRemoval] = useState(false);
  const [showAtlasModal, setShowAtlasModal] = useState(false);
  const [showDataToolsModal, setShowDataToolsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [emailTestMode, setEmailTestMode] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  useEffect(() => {
    checkTheme();
    const saved = loadEmailTestSettings();
    setEmailTestMode(saved.enabled);
    setTestEmailAddress(saved.address);
    const runAuthCheck = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profile?.password_needs_change) {
          router.push('/auth/change-password-required');
          return;
        }

        setUser(profile as DashboardProfile);
        setUserRole(profile?.role_tier || null);
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      }
    };

    runAuthCheck();
  }, [router]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const themeEvent = event as CustomEvent<{ isDark: boolean }>;
      setIsDark(themeEvent.detail.isDark);
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

  const handleSaveEmailSettings = () => {
    saveEmailTestSettings({ enabled: emailTestMode, address: testEmailAddress });
    alert(`Email test mode ${emailTestMode ? 'enabled' : 'disabled'}`);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    router.push('/login');
  };

  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true);
    try {
      const response = await fetch('/api/email-logs?limit=30', { method: 'GET' });
      const data = await response.json();
      if (response.ok && data?.success) {
        setEmailLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  useEffect(() => {
    if (showNotificationsModal) {
      fetchEmailLogs();
    }
  }, [showNotificationsModal]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Training Portal
              </h1>
              <p className={`mt-1 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome, {user?.full_name || 'User'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 p-1.5 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
              <button
                onClick={handleSignOut}
                className="px-2 py-1 text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                Sign Out
              </button>
              <ThemeToggle />
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

              {/* Notifications Card */}
              <div
                onClick={() => setShowNotificationsModal(true)}
                className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:border-sky-500 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:border-sky-500 hover:bg-sky-50'
                }`}
              >
                <div className="text-5xl mb-4">🔔</div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Notifications
                </h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email test mode controls and recent sent-email activity.
                </p>
                <div className="mt-6 flex items-center text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold">Open</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Data Housekeeping Card */}
              <div
                onClick={() => setShowDataToolsModal(true)}
                className={`group cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:border-orange-500 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                }`}
              >
                <div className="text-5xl mb-4">🧰</div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Data Housekeeping
                </h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Open tools for duplicate cleanup and archive recovery.
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
            Choose which application you&apos;d like to access
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

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className={`px-3 py-1 rounded ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                Close
              </button>
            </div>

            <div className={`rounded-lg border p-4 mb-4 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Test Mode</h4>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={emailTestMode}
                  onChange={(e) => setEmailTestMode(e.target.checked)}
                />
                <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Enable Test Mode</span>
              </label>
              <input
                type="email"
                placeholder="test@yourdomain.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className={`w-full px-3 py-2 rounded border text-sm mb-3 ${
                  isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={handleSaveEmailSettings}
                className="px-4 py-2 rounded font-semibold text-white bg-sky-600 hover:bg-sky-700"
              >
                Save Email Settings
              </button>
            </div>

            <div className={`rounded-lg border p-4 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Email Activity</h4>
                <button
                  onClick={fetchEmailLogs}
                  className="px-3 py-1 rounded text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700"
                >
                  Refresh
                </button>
              </div>

              {emailLogsLoading ? (
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading email logs...</p>
              ) : emailLogs.length === 0 ? (
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No email logs found yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {emailLogs.map((log) => (
                    <div key={log.id} className={`rounded border p-2 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{log.subject}</p>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${log.status === 'sent' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                          {log.status}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(log.created_at).toLocaleString()} | Provider: {log.provider || 'unknown'} {log.test_mode ? '| TEST MODE' : ''}
                      </p>
                      <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Delivered to: {(log.delivered_recipients || []).join(', ')}
                      </p>
                      {!!log.error_text && <p className="text-xs mt-1 text-red-400 truncate">Error: {log.error_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Housekeeping Modal */}
      {showDataToolsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-xl w-full rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Data Housekeeping</h3>
              <button
                onClick={() => setShowDataToolsModal(false)}
                className={`px-3 py-1 rounded ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                Close
              </button>
            </div>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose a tool:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowDataToolsModal(false);
                  setShowDuplicateRemoval(true);
                }}
                className="py-3 rounded font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Clean Duplicates
              </button>
              <button
                onClick={() => {
                  setShowDataToolsModal(false);
                  router.push('/admin/archive');
                }}
                className="py-3 rounded font-semibold text-white bg-orange-600 hover:bg-orange-700"
              >
                Archive & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
