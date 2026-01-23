import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get all profiles
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, location, role_tier')
      .order('email');

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Count total
    const total = profiles?.length || 0;

    // Find Ana's profile
    const ana = profiles?.find(p => p.email?.toLowerCase().includes('ana.portugal'));

    return Response.json({
      total,
      ana_profile: ana,
      all_emails: profiles?.map(p => ({ id: p.id, email: p.email, name: p.full_name })) || []
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
