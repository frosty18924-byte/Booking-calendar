'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { useNavDrawer } from '@/app/components/NavDrawerProvider';

export default function SlideOutNav() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { isOpen, close, toggle } = useNavDrawer();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const authed = !!data.session?.user;
      setIsAuthenticated(authed);
      if (!authed) {
        setUserRole(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role_tier')
        .eq('id', data.session?.user?.id)
        .single();
      if (!mounted) return;
      setUserRole(profile?.role_tier ?? null);
    };

    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (!session?.user) {
        setUserRole(null);
        return;
      }
      supabase
        .from('profiles')
        .select('role_tier')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setUserRole(data?.role_tier ?? null))
        .catch(() => setUserRole(null));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth/');
  if (isAuthPage) return null;

  const canTemplatesAdmin = useMemo(() => hasPermission(userRole, 'TEMPLATES', 'canEdit'), [userRole]);
  const canAdminTools = useMemo(() => hasPermission(userRole, 'STAFF_MANAGEMENT', 'canView'), [userRole]);

  const go = (path: string) => {
    close();
    router.push(path);
  };

  const showButtonsDesktop = true;
  const showButtonsMobile = true;

  return (
    <>
      {/* Desktop buttons (Home + Menu) */}
      {showButtonsDesktop && (
        <div className="hidden sm:block" style={{ position: 'fixed', top: '4rem', left: '1rem', zIndex: 1000 }}>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 p-1.5 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
            <button
              onClick={() => go('/')}
              className="no-ui-motion inline-flex items-center justify-center rounded-lg border px-2 py-2 shadow-sm transition-colors dark:border-slate-700"
              style={{ backgroundColor: 'transparent' }}
              title="Portal"
              aria-label="Portal"
            >
              <Icon name="home" className="w-6 h-6" />
            </button>
            <button
              onClick={toggle}
              className="no-ui-motion inline-flex items-center justify-center rounded-lg border px-2 py-2 shadow-sm transition-colors dark:border-slate-700"
              style={{ backgroundColor: 'transparent' }}
              title="Menu"
              aria-label="Menu"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile buttons (Dashboard only) */}
      {showButtonsMobile && (
        <div className="sm:hidden" style={{ position: 'fixed', top: '4rem', left: '1rem', zIndex: 1000 }}>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 p-1.5 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
            <button
              onClick={() => go('/')}
              className="no-ui-motion inline-flex items-center justify-center rounded-lg border px-2 py-2 shadow-sm transition-colors dark:border-slate-700"
              style={{ backgroundColor: 'transparent' }}
              title="Portal"
              aria-label="Portal"
            >
              <Icon name="home" className="w-6 h-6" />
            </button>
            <button
              onClick={toggle}
              className="no-ui-motion inline-flex items-center justify-center rounded-lg border px-2 py-2 shadow-sm transition-colors dark:border-slate-700"
              style={{ backgroundColor: 'transparent' }}
              title="Menu"
              aria-label="Menu"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[1100]">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="absolute left-0 top-0 h-full w-[92vw] max-w-sm border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">Menu</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{isAuthenticated ? 'Signed in' : 'Not signed in'}</p>
              </div>
              <button
                onClick={close}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-2 text-slate-700 shadow-sm dark:border-slate-800 dark:text-slate-200"
                aria-label="Close menu"
                title="Close"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4">
              <div className="grid gap-8">
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Portal</p>
                  <div className="grid gap-3">
                    <button
                      onClick={() => go('/dashboard')}
                      className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-800 dark:hover:border-blue-400"
                    >
                      <div className="text-4xl mb-2 leading-none">🎓</div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Training</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dashboard and tools</p>
                    </button>

                    <button
                      onClick={() => go('/templates')}
                      className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-800 dark:hover:border-blue-400"
                    >
                      <div className="text-4xl mb-2 leading-none">📄</div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Template Gallery</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">View, print, or download</p>
                    </button>

                    {canAdminTools && (
                      <button
                        onClick={() => go('/admin-tools')}
                        className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-800 dark:hover:border-blue-400"
                      >
                        <div className="text-4xl mb-2 leading-none">🛠️</div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Admin</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Staff + system tools</p>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Apps</p>
                  <div className="grid gap-3">
                    <button
                      onClick={() => go('/training-matrix')}
                      className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 dark:border-slate-800 dark:hover:border-purple-400"
                    >
                      <div className="text-4xl mb-2 leading-none">📊</div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Training Matrix</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Staff training records</p>
                    </button>

                    <button
                      onClick={() => go('/apps/booking-calendar')}
                      className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-800 dark:hover:border-emerald-400"
                    >
                      <div className="text-4xl mb-2 leading-none">📆</div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Booking Calendar</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Schedule and bookings</p>
                    </button>

                    <button
                      onClick={() => go('/apps/expiry-checker')}
                      className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-800 dark:hover:border-blue-400"
                    >
                      <div className="text-4xl mb-2 leading-none">📅</div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Course Expiry</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expiring and expired</p>
                    </button>

                    <button
                      onClick={() => go('/apps/training-course-checker')}
                      className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-800 dark:hover:border-blue-400"
                    >
                      <div className="text-4xl mb-2 leading-none">🔎</div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Course Checker</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Search course data</p>
                    </button>

                    {canTemplatesAdmin && (
                      <button
                        onClick={() => go('/templates/admin')}
                        className="text-left rounded-3xl border p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-800 dark:hover:border-blue-400"
                      >
                        <div className="text-4xl mb-2 leading-none">⬆️</div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Templates Admin</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Upload and edit</p>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </nav>

            
          </aside>
        </div>
      )}
    </>
  );
}
