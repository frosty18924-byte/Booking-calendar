'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { supabase } from '@/lib/supabase';
import Icon from './Icon';
import UniformButton from './UniformButton';
import { useNavDrawer } from '@/app/components/NavDrawerProvider';

export default function GlobalTopControls() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle } = useNavDrawer();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthenticated(!!data.session?.user);
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAuthPage = pathname === '/login' || pathname?.startsWith('/auth/');
  const isDashboardPage = pathname === '/dashboard';
  
  // Only show Sign Out button on main hub pages
  const isMainPage = pathname === '/' || pathname === '/training-matrix' || pathname === '/templates' || pathname === '/admin' || pathname === '/admin-tools';

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    router.push('/login');
  };

  if (isAuthPage || isDashboardPage) return null;

  const showSignOut = !loading && isAuthenticated && isMainPage;

  return (
    <>
      {/* Mobile: control buttons positioned below header on sides - prevents content overlap */}
      <div className="sm:hidden" style={{ position: 'fixed', top: 'calc(7.5rem + env(safe-area-inset-top))', right: '1rem', zIndex: 1000 }}>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200/70 bg-white/85 p-1 shadow-md backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
          <UniformButton
            variant="secondary"
            className="no-ui-motion p-1 shadow-sm border text-sm"
            onClick={() => router.push('/')}
            title="Portal"
            aria-label="Portal"
          >
            <Icon name="home" className="w-4 h-4" />
          </UniformButton>
          <UniformButton
            variant="secondary"
            className="no-ui-motion p-1 shadow-sm border text-sm"
            onClick={toggle}
            title="Menu"
            aria-label="Menu"
          >
            <Icon name="menu" className="w-4 h-4" />
          </UniformButton>
          {showSignOut ? (
            <UniformButton variant="danger" size="sm" className="no-ui-motion shadow-sm text-xs" onClick={handleSignOut}>
              Sign Out
            </UniformButton>
          ) : null}
          <ThemeToggle className="no-ui-motion relative" />
        </div>
      </div>

      {/* Tablet and Desktop: keep buttons at top-right but position below header on smaller screens */}
      <div className="hidden sm:block" style={{ position: 'fixed', top: 'calc(7.5rem + env(safe-area-inset-top))', right: '1rem', zIndex: 1000 }}>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 p-1.5 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
          {showSignOut ? (
            <UniformButton variant="danger" size="sm" className="no-ui-motion shadow-md" onClick={handleSignOut}>
              Sign Out
            </UniformButton>
          ) : null}
          <ThemeToggle className="no-ui-motion relative" />
        </div>
      </div>
    </>
  );
}
