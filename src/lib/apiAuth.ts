import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export type RoleTier = 'staff' | 'manager' | 'scheduler' | 'admin';

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function requireRole(allowedRoles: RoleTier[]) {
  const reqHeaders = await headers();
  const authHeader = reqHeaders.get('authorization') || reqHeaders.get('Authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  let user: { id: string } | null = null;
  let userError: unknown = null;

  if (bearerToken) {
    const tokenClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      }
    );
    const { data, error } = await tokenClient.auth.getUser();
    user = data.user;
    userError = error;
  } else {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op in route handlers.
          },
        },
      }
    );
    const { data, error } = await authClient.auth.getUser();
    user = data.user;
    userError = error;
  }

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, role_tier')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) } as const;
  }

  if (!allowedRoles.includes(profile.role_tier as RoleTier)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }

  return { userId: profile.id as string, role: profile.role_tier as RoleTier, service } as const;
}
