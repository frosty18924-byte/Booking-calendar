import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RoleTier = 'staff' | 'manager' | 'scheduler' | 'admin';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data: userRes, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id,role_tier')
    .eq('id', userRes.user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const role = profile.role_tier as RoleTier;
  if (role !== 'admin' && role !== 'scheduler') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const bookingId = body?.bookingId as string | undefined;
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const snapshot = { booking };

  const { data: archiveRow, error: archiveErr } = await supabaseAdmin
    .from('deleted_items')
    .insert([
      {
        entity_type: 'booking',
        entity_id: String(booking.id),
        location_id: null,
        snapshot,
        deleted_by: profile.id,
      },
    ])
    .select('id')
    .single();

  if (archiveErr) {
    return NextResponse.json({ error: archiveErr.message, code: archiveErr.code }, { status: 400 });
  }

  const { error: deleteErr } = await supabaseAdmin
    .from('bookings')
    .delete()
    .eq('id', bookingId);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message, code: deleteErr.code }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    removed: {
      deleted_item_id: archiveRow.id,
      booking_id: bookingId,
    },
  });
}
