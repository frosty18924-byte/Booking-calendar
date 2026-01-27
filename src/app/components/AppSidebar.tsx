'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AppSidebar({ isDark }: { isDark: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const apps = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      path: '/dashboard',
      description: 'Back to app selection',
    },
    {
      id: 'expiry-checker',
      label: 'Course Expiry',
      icon: '📅',
      path: '/apps/expiry-checker',
      description: 'Track course certifications',
    },
    {
      id: 'booking-calendar',
      label: 'Booking Calendar',
      icon: '📆',
      path: '/apps/booking-calendar',
      description: 'Schedule & manage bookings',
    },
  ];

  const isAppRoute = pathname.startsWith('/apps/') || pathname.startsWith('/dashboard');

  const currentApp = apps.find(app => 
    pathname === app.path || 
    (pathname === '/' && app.id === 'dashboard') ||
    (pathname.startsWith(app.path) && app.id !== 'dashboard')
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  useEffect(() => {
    // Close mobile sidebar when route changes
    setShowMobileSidebar(false);
  }, [pathname]);

  if (!isAppRoute) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen transition-all duration-300 z-40 ${
          isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'
        } border-r flex flex-col w-64 ${
          isCollapsed ? 'lg:w-20' : ''
        } ${
          showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className={`p-4 border-b transition-colors duration-300 ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className={`font-bold text-lg transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Apps
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1 rounded hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors duration-300 ${
                isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
            </button>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="p-1 rounded lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Apps List */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {apps.map(app => (
            <button
              key={app.id}
              onClick={() => {
                router.push(app.path);
                setShowMobileSidebar(false);
              }}
              title={isCollapsed ? app.label : ''}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                currentApp?.id === app.id
                  ? isDark
                    ? 'bg-blue-900 text-blue-100'
                    : 'bg-blue-100 text-blue-900'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{app.icon}</span>
              {!isCollapsed && (
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">{app.label}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{app.description}</p>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t transition-colors duration-300 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              isDark
                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800'
                : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
            }`}
            title={isCollapsed ? 'Sign Out' : ''}
          >
            <span className="text-xl">🚪</span>
            {!isCollapsed && <span className="font-semibold text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Toggle (for small screens) */}
      {!showMobileSidebar && (
        <button
          onClick={() => setShowMobileSidebar(true)}
          className={`fixed bottom-6 left-6 lg:hidden z-30 p-3 rounded-full shadow-lg transition-all duration-300 ${
            isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          title="Open sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
}
