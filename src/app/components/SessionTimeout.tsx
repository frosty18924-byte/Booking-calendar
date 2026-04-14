'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function SessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const sessionStartTimeRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const checkSessionValidity = async () => {
    // Don't check on auth/login pages
    if (pathname === '/login' || pathname === '/auth/change-password-required') {
      return;
    }

    const elapsedTime = Date.now() - sessionStartTimeRef.current;

    if (elapsedTime >= TIMEOUT_DURATION) {
      // 5 minutes have elapsed, log out
      await handleLogout();
    }
  };

  useEffect(() => {
    // Reset session start time when user navigates (not on login pages)
    if (pathname !== '/login' && pathname !== '/auth/change-password-required') {
      sessionStartTimeRef.current = Date.now();
    }
  }, [pathname]);

  useEffect(() => {
    // Handle app visibility changes (lock, tab switch, minimize)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // App is coming back into focus, check if timeout has elapsed
        await checkSessionValidity();
      }
    };

    // Track user activity to reset the timer
    const handleActivity = () => {
      // Reset session timer on user activity
      sessionStartTimeRef.current = Date.now();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for absolute 5 minutes
      timeoutRef.current = setTimeout(async () => {
        await handleLogout();
      }, TIMEOUT_DURATION);
    };

    // Don't set timers on auth/login pages
    if (pathname !== '/login' && pathname !== '/auth/change-password-required') {
      // Initialize timer
      sessionStartTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(async () => {
        await handleLogout();
      }, TIMEOUT_DURATION);

      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Listen for user activity
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.addEventListener(event, handleActivity);
      });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        events.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  return null;
}

