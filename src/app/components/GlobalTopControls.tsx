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

  return null;
}

