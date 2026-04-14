'use client';

import { useNavDrawer } from '@/app/components/NavDrawerProvider';
import Icon from './Icon';
import UniformButton from './UniformButton';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FixedHeader() {
  const { toggle } = useNavDrawer();
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 gap-2">
        {/* Left: Menu button */}
        <UniformButton
          variant="secondary"
          className="no-ui-motion p-2 shadow-sm border"
          onClick={toggle}
          title="Menu"
          aria-label="Menu"
        >
          <Icon name="menu" className="w-6 h-6" />
        </UniformButton>
        
        {/* Center spacer */}
        <div className="flex-1" />
        
        {/* Right: Home button, Theme toggle, and Sign Out */}
        <div className="flex items-center gap-2">
          <UniformButton
            variant="secondary"
            className="no-ui-motion p-2 shadow-sm border"
            onClick={() => router.push('/')}
            title="Home"
            aria-label="Home"
          >
            <Icon name="home" className="w-6 h-6" />
          </UniformButton>

          <ThemeToggle className="no-ui-motion relative" />

          {!loading && isAuthenticated && (
            <UniformButton
              variant="danger"
              size="sm"
              className="no-ui-motion shadow-sm"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
            >
              Sign Out
            </UniformButton>
          )}
        </div>
      </div>
    </header>
  );
}
