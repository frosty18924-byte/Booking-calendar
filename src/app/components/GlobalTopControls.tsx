'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { supabase } from '@/lib/supabase';

export default function GlobalTopControls() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthenticated(!!data.user);
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

  if (isDashboardPage) return null;

  return (
    <div className="flex justify-between items-center px-2 sm:px-4">
      <div></div> {/* Empty div for left side spacing */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {!loading && !isAuthPage && isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="p-2 hover:opacity-80 rounded-lg font-bold text-xl sm:text-2xl text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
