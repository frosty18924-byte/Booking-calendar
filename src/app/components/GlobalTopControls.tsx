'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import HomeButton from './HomeButton';
import { supabase } from '@/lib/supabase';

export default function GlobalTopControls() {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    router.push('/login');
  };

  if (isAuthPage || isDashboardPage) return null;

  const showSignOut = !loading && isAuthenticated;

  return (
    <>
      <HomeButton />
      <div style={{ position: 'fixed', top: '4rem', right: '1rem', zIndex: 1000 }}>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 p-1.5 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
          <button
            onClick={handleSignOut}
            disabled={!showSignOut}
            aria-hidden={!showSignOut}
            className={`no-ui-motion relative px-2 py-1 text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 transition-colors ${showSignOut ? '' : 'invisible pointer-events-none'}`}
          >
            Sign Out
          </button>
          <ThemeToggle className="no-ui-motion relative" />
        </div>
      </div>
    </>
  );
}
