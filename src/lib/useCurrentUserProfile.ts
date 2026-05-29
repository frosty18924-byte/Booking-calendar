"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  const parseJsonResponse = async (response: Response) => {
    try {
      return await response.json();
    } catch (error) {
      const body = await response
        .text()
        .catch(() => "<unable to read response body>");
      throw new Error(`Invalid JSON response from profile endpoint: ${body}`);
    }
  };

  const loadProfile = async () => {
    let session: {
      access_token?: string | null;
      user?: {
        id: string;
        email?: string | null;
        user_metadata?: {
          full_name?: string | null;
        };
      } | null;
    } | null = null;
    let sessionUser: {
      id: string;
      email?: string | null;
      user_metadata?: {
        full_name?: string | null;
      };
    } | null = null;

    try {
      const { data } = await supabase.auth.getSession();
      session = data.session || null;
      sessionUser = session?.user || null;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        clearTimeout(timeoutId);

        const result = await parseJsonResponse(response);
        if (response.ok) {
          setProfile((result?.profile || null) as CurrentUserProfile | null);
          setIsAuthenticated(true);
          return;
        }

        if (response.status !== 401) {
          throw new Error(
            result?.error || `Unable to load profile (${response.status})`,
          );
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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Profile request timed out');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error("Error loading current user profile:", error);
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
    // Skip profile loading on login and auth pages
    if (pathname === '/login' || pathname === '/auth/callback' || pathname.startsWith('/auth/')) {
      setProfile(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    let mounted = true;
    let isInitialLoad = true;

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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Only sync on auth state changes after the initial load
        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        if (event === "SIGNED_OUT" || !session?.user) {
          setProfile(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        await syncProfile();
      },
    );

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
