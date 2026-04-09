'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';
import AdminToolsPanel from '@/app/components/AdminToolsPanel';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    window.addEventListener('storage', checkTheme);
    return () => {
      window.removeEventListener('themeChange', checkTheme);
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);
      const { data: profile } = await supabase.from('profiles').select('role_tier, full_name').eq('id', user.id).single();
      const role = (profile?.role_tier ?? null) as string | null;
      setUserRole(role);
      setUserName(profile?.full_name ?? null);
    };
    loadRole();
  }, [router]);

  return (
    <main
      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}
      className="min-h-screen px-4 pb-10 pt-28 sm:pt-10 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <div
          style={{
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: isDark ? '#1f2937' : '#e2e8f0',
          }}
          className="rounded-[32px] border shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10">
            <div className="text-center sm:text-left">
              {(userName || userEmail || userRole) && (
                <p className={`mb-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Signed in as:{' '}
                  <span className="font-semibold">
                    {userName?.trim() || userEmail || 'User'}
                  </span>
                  {userRole ? <span className="font-semibold"> {'·'} {userRole}</span> : null}
                </p>
              )}
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">Cascade Portal</h1>
              <p className={`mt-2 text-sm md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Choose where you want to go.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:gap-6 md:grid-cols-2">
              <button
                onClick={() => router.push('/dashboard')}
                className={`group text-left rounded-3xl border p-6 md:p-8 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isDark
                    ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-950/60 hover:border-blue-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-5xl mb-4 leading-none">🎓</div>
                    <h2 className="text-xl md:text-2xl font-extrabold">Training</h2>
                    <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Open the training dashboard.
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center justify-center rounded-2xl border p-3 transition-colors ${
                      isDark
                        ? 'border-slate-700 bg-slate-900/40 group-hover:bg-slate-900/60'
                        : 'border-slate-200 bg-slate-50 group-hover:bg-white'
                    }`}
                  >
                    <Icon name="chevron-right" className="w-6 h-6" />
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push('/templates')}
                className={`group text-left rounded-3xl border p-6 md:p-8 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isDark
                    ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-950/60 hover:border-blue-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-5xl mb-4 leading-none">📄</div>
                    <h2 className="text-xl md:text-2xl font-extrabold">Template Gallery</h2>
                    <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Search, view, print, or download templates.
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center justify-center rounded-2xl border p-3 transition-colors ${
                      isDark
                        ? 'border-slate-700 bg-slate-900/40 group-hover:bg-slate-900/60'
                        : 'border-slate-200 bg-slate-50 group-hover:bg-white'
                    }`}
                  >
                    <Icon name="chevron-right" className="w-6 h-6" />
                  </span>
                </div>
              </button>
            </div>

            <AdminToolsPanel isDark={isDark} userRole={userRole} />
          </div>
        </div>
      </div>
    </main>
  );
}
