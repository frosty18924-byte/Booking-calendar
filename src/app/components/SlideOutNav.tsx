'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';
import UniformButton from '@/app/components/UniformButton';
import TileButton from '@/app/components/TileButton';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { useNavDrawer } from '@/app/components/NavDrawerProvider';

export default function SlideOutNav() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { isOpen, close, toggle } = useNavDrawer();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

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
  const canTemplatesAdmin = useMemo(() => hasPermission(userRole, 'TEMPLATES', 'canEdit'), [userRole]);
  const canAdminTools = useMemo(() => hasPermission(userRole, 'STAFF_MANAGEMENT', 'canView'), [userRole]);

  useEffect(() => {
    // Default the open section based on where the user currently is.
    if (!pathname) return;
    const isTemplatesPath = pathname === '/templates' || pathname.startsWith('/templates/');
    const isAdminPath = pathname === '/admin-tools' || pathname.startsWith('/admin-tools/') || pathname === '/admin' || pathname.startsWith('/admin/');

    if (isTemplatesPath) {
      setTrainingOpen(false);
      setTemplatesOpen(true);
      setAdminOpen(false);
      return;
    }

    if (isAdminPath) {
      setTrainingOpen(false);
      setTemplatesOpen(false);
      setAdminOpen(true);
      return;
    }

    setTrainingOpen(true);
    setTemplatesOpen(false);
    setAdminOpen(false);
  }, [pathname]);

  // Important: do not return before all hooks have run (Rules of Hooks).
  // Drawer is now available on all pages for navigation flexibility

  const go = (path: string) => {
    close();
    router.push(path);
  };

  return (
    <>
      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[1100]">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="absolute left-0 top-0 h-full w-[92vw] max-w-sm border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800 flex-shrink-0">
	              <div className="min-w-0">
	                <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">Menu</p>
	                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{isAuthenticated ? 'Signed in' : 'Not signed in'}</p>
	              </div>
	              <UniformButton
	                variant="secondary"
	                size="sm"
	                onClick={close}
	                className="no-ui-motion p-2 shadow-md border"
	                aria-label="Close menu"
	                title="Close"
	              >
	                <Icon name="close" className="w-5 h-5" />
	              </UniformButton>
	            </div>

            <nav className="p-4 overflow-y-auto flex-1">
              <div className="grid gap-4">
                {/* Home Button */}
                <TileButton 
                  title="Home" 
                  description="Back to portal" 
                  size="sm" 
                  accent="blue" 
                  onClick={() => go('/')} 
                />
                
                {/* Training */}
                <section className="rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTrainingOpen(v => !v)}
                    aria-expanded={trainingOpen}
                    aria-controls="nav-training-items"
                    className="w-full text-left p-5 rounded-3xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Training</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dashboard and apps</p>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {trainingOpen ? 'Hide' : 'Show'}
                      </span>
                    </div>
                  </button>

	                  {trainingOpen && (
	                    <div id="nav-training-items" className="px-5 pb-5">
	                      <div className="grid gap-3">
	                        <TileButton title="Dashboard" description="Overview and tools" size="sm" accent="blue" onClick={() => go('/dashboard')} />

	                        <TileButton title="Training Matrix" description="Staff training records" size="sm" accent="purple" onClick={() => go('/training-matrix')} />

	                        <TileButton title="Booking Calendar" description="Schedule and bookings" size="sm" accent="emerald" onClick={() => go('/apps/booking-calendar')} />

	                        <TileButton title="Course Expiry" description="Expiring and expired" size="sm" accent="blue" onClick={() => go('/apps/expiry-checker')} />

	                        <TileButton title="Course Checker" description="Search course data" size="sm" accent="blue" onClick={() => go('/apps/training-course-checker')} />
	                      </div>
	                    </div>
	                  )}
	                </section>

                {/* Templates */}
                <section className="rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTemplatesOpen(v => !v)}
                    aria-expanded={templatesOpen}
                    aria-controls="nav-templates-items"
                    className="w-full text-left p-5 rounded-3xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Templates</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gallery and admin</p>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {templatesOpen ? 'Hide' : 'Show'}
                      </span>
                    </div>
                  </button>

	                  {templatesOpen && (
	                    <div id="nav-templates-items" className="px-5 pb-5">
	                      <div className="grid gap-3">
	                        <TileButton title="Template Gallery" description="View, print, or download" size="sm" accent="blue" onClick={() => go('/templates')} />

	                        {canTemplatesAdmin && (
	                          <TileButton title="Templates Admin" description="Upload and edit" size="sm" accent="blue" onClick={() => go('/templates/admin')} />
	                        )}
	                      </div>
	                    </div>
	                  )}
	                </section>

                {/* Admin */}
                {canAdminTools && (
                  <section className="rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAdminOpen(v => !v)}
                      aria-expanded={adminOpen}
                      aria-controls="nav-admin-items"
                      className="w-full text-left p-5 rounded-3xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white">Admin</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Staff and system tools</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {adminOpen ? 'Hide' : 'Show'}
                        </span>
                      </div>
                    </button>

	                    {adminOpen && (
	                      <div id="nav-admin-items" className="px-5 pb-5">
	                        <div className="grid gap-3">
	                          <TileButton title="Manage Staff" description="Create, edit, and assign staff" size="sm" accent="blue" onClick={() => go('/admin-tools?open=staff')} />

	                          <TileButton title="Notifications" description="Email test mode and activity" size="sm" accent="blue" onClick={() => go('/admin-tools?open=notifications')} />

	                          <TileButton title="Housekeeping" description="Duplicate cleanup and archive" size="sm" accent="blue" onClick={() => go('/admin-tools?open=housekeeping')} />
	                        </div>
	                      </div>
	                    )}
	                  </section>
	                )}
              </div>
            </nav>

            
          </aside>
        </div>
      )}
    </>
  );
}
