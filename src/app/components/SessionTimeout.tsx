'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function SessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = async () => {
    // Don't reset timer on auth/login pages
    if (pathname === '/login' || pathname === '/auth/change-password-required') {
      return;
    }

    lastActivityRef.current = Date.now();

    // Clear existing timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timer
    timeoutRef.current = setTimeout(async () => {
      try {
        // Check if user is still authenticated
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          // User is authenticated, sign them out
          await supabase.auth.signOut();
          router.push('/login');
        }
      } catch (error) {
        console.error('Session timeout error:', error);
        router.push('/login');
      }
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    // Reset timer on page load/route change (if not on login page)
    if (pathname !== '/login' && pathname !== '/auth/change-password-required') {
      resetTimer();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  useEffect(() => {
    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [pathname]);

  return null;
}
