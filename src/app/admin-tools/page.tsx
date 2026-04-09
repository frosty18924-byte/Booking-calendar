'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import AdminToolsPanel from '@/app/components/AdminToolsPanel';

export default function AdminToolsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    window.addEventListener('storage', checkTheme);
    return () => {
      window.removeEventListener('themeChange', checkTheme);
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('role_tier').eq('id', user.id).single();
        const role = (profile?.role_tier ?? null) as string | null;
        setUserRole(role);

        if (!hasPermission(role, 'STAFF_MANAGEMENT', 'canView')) {
          router.push('/');
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="max-w-5xl mx-auto text-sm text-slate-600">Loading…</div>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 py-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }}
          className="rounded-[32px] border shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10 border-b" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight">Admin</h1>
                <p className={`mt-2 text-sm md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Manage staff and system settings.</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm ${
                  isDark ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-900/60' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                Back
              </button>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <AdminToolsPanel isDark={isDark} userRole={userRole} />
          </div>
        </div>
      </div>
    </main>
  );
}

