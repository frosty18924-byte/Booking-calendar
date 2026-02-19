import { requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;
    const { service: supabaseAdmin } = authz;

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
