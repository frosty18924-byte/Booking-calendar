import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/apiAuth';

type ProfileUpdatePayload = {
  full_name?: unknown;
  email?: unknown;
  phone_number?: unknown;
  avatar_path?: unknown;
};

function sanitizeString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function PATCH(request: Request) {
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

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as ProfileUpdatePayload;
  const fullName = sanitizeString(body.full_name, 120);
  const email = sanitizeString(body.email, 255);
  const phoneNumber = sanitizeString(body.phone_number, 50);
  const avatarPath = sanitizeString(body.avatar_path, 500);

  if (!fullName) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (avatarPath && !avatarPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Invalid avatar path.' }, { status: 400 });
  }

  const service = createServiceClient();

  const authUpdate = await service.auth.admin.updateUserById(user.id, {
    email,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authUpdate.error) {
    return NextResponse.json({ error: authUpdate.error.message }, { status: 400 });
  }

  const updatePayload = {
    full_name: fullName,
    email,
    phone_number: phoneNumber,
    avatar_path: avatarPath,
  };

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select('id, full_name, email, phone_number, avatar_path, role_tier')
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ profile });
}
