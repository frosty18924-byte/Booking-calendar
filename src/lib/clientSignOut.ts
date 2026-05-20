'use client';

import { supabase } from '@/lib/supabase';

export async function signOutClientSide() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const browserSignOut = supabase.auth.signOut();
  const serverSignOut = fetch('/api/auth/sign-out', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  const [browserResult, serverResult] = await Promise.allSettled([browserSignOut, serverSignOut]);

  if (browserResult.status === 'rejected') {
    throw browserResult.reason;
  }

  if (browserResult.value.error) {
    throw browserResult.value.error;
  }

  if (serverResult.status === 'rejected') {
    throw serverResult.reason;
  }

  if (!serverResult.value.ok) {
    throw new Error('Unable to clear server session');
  }

  if (typeof window !== 'undefined') {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        window.localStorage.removeItem(key);
      }
    });
  }
}
