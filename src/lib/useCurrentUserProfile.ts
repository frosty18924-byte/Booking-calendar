'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export type CurrentUserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  avatar_path: string | null;
  role_tier: string | null;
  password_needs_change?: boolean | null;
};

type UseCurrentUserProfileState = {
  profile: CurrentUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

export function useCurrentUserProfile(): UseCurrentUserProfileState {
  const pathname = usePathname();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    let session:
      | {
          access_token?: string | null;
          user?: {
            id: string;
            email?: string | null;
            user_metadata?: {
              full_name?: string | null;
            };
          } | null;
        }
      | null = null;
    let sessionUser:
      | {
          id: string;
          email?: string | null;
          user_metadata?: {
            full_name?: string | null;
          };
        }
      | null = null;

    try {
      const { data } = await supabase.auth.getSession();
      session = data.session || null;
      sessionUser = session?.user || null;

      const response = await fetch('/api/profile', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
      });

      if (response.ok) {
        const result = await response.json();
        setProfile((result?.profile || null) as CurrentUserProfile | null);
        setIsAuthenticated(true);
        return;
      }

      if (response.status !== 401) {
        throw new Error('Unable to load profile');
      }

      if (sessionUser) {
        setIsAuthenticated(true);
        setProfile({
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || null,
          email: sessionUser.email || null,
          phone_number: null,
          avatar_path: null,
          role_tier: null,
          password_needs_change: null,
        });
        return;
      }

      setProfile(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error loading current user profile:', error);
      if (sessionUser) {
        setIsAuthenticated(true);
        setProfile({
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || null,
          email: sessionUser.email || null,
          phone_number: null,
          avatar_path: null,
          role_tier: null,
          password_needs_change: null,
        });
        return;
      }

      setProfile(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncProfile = async () => {
      if (mounted) {
        setLoading(true);
      }

      await loadProfile();

      if (mounted) {
        setLoading(false);
      }
    };

    syncProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      await syncProfile();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  return {
    profile,
    isAuthenticated,
    loading,
    refreshProfile: loadProfile,
  };
}
