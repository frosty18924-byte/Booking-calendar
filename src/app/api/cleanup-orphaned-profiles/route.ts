import { requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;
    const { service: supabaseAdmin } = authz;

    // Get all profiles
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email');

    // Get all auth users
    const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers();

    if (!allProfiles || !allAuthUsers) {
      return Response.json({ error: 'Failed to fetch data' }, { status: 400 });
    }

    const authUserIds = new Set(allAuthUsers.map(u => u.id));
    
    // Find orphaned profiles (profiles whose IDs don't have corresponding auth users)
    const orphanedProfiles = allProfiles.filter(p => !authUserIds.has(p.id));

    console.log('Total profiles:', allProfiles.length);
    console.log('Total auth users:', allAuthUsers.length);
    console.log('Orphaned profiles found:', orphanedProfiles.length);
    console.log('Orphaned profiles:', orphanedProfiles);

    if (orphanedProfiles.length === 0) {
      return Response.json({
        message: 'No orphaned profiles found',
        totalProfiles: allProfiles.length,
        totalAuthUsers: allAuthUsers.length,
        orphanedCount: 0
      });
    }

    // Delete all orphaned profiles and their bookings
    let deletedCount = 0;
    for (const profile of orphanedProfiles) {
      // Delete bookings first
      await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('profile_id', profile.id);

      // Delete profile
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (!error) {
        deletedCount++;
        console.log('Deleted orphaned profile:', profile.email, profile.id);
      }
    }

    return Response.json({
      message: `Cleaned up ${deletedCount} orphaned profiles`,
      orphanedProfiles: orphanedProfiles.map(p => ({ id: p.id, email: p.email })),
      deletedCount,
      totalProfiles: allProfiles.length,
      totalAuthUsers: allAuthUsers.length
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
