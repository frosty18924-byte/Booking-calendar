import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface StaffMember {
  full_name: string;
  email: string;
  location: string;
  role_tier: 'staff' | 'scheduler' | 'admin';
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json();
    const staffMembers: StaffMember[] = Array.isArray(body) ? body : [body];

    // Validate environment variables
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
        },
        { status: 500 }
      );
    }

    // Validate input
    for (const staff of staffMembers) {
      if (!staff.full_name || !staff.email || !staff.location) {
        return Response.json(
          {
            success: false,
            error: 'Missing required fields: full_name, email, location',
          },
          { status: 400 }
        );
      }
    }

    const results = [];

    for (const staff of staffMembers) {
    for (const staff of staffMembers) {
      try {
        console.log('Adding staff member:', staff.email);
        console.log('Staff data:', JSON.stringify(staff));
        
        // Check if email already exists in profiles
        const emailToCheck = staff.email.toLowerCase();
        const { data: existingProfiles, error: checkError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, is_deleted')
          .eq('email', emailToCheck);

        if (checkError) {
          console.error('Error checking existing profiles:', checkError);
          results.push({
            email: staff.email,
            success: false,
            error: `Failed to check existing profiles: ${checkError.message}`,
          });
          continue;
        }

        // Allow re-adding deleted staff with same email
        const activeProfile = existingProfiles?.find(p => !p.is_deleted);
        if (activeProfile) {
          console.warn('Staff already exists:', staff.email);
          results.push({
            email: staff.email,
            success: false,
            error: `Staff member with email ${staff.email} already exists`,
          });
          continue;
        }

        // Generate a roster-only profile ID (UUID)
        const profileId = crypto.randomUUID();
        
        console.log('Creating roster-only profile for:', staff.email, 'with ID:', profileId);
        
        // Create profile only (no auth user)
        const { error: profileError, data: profileData } = await supabaseAdmin
          .from('profiles')
          .insert([
            {
              id: profileId,
              full_name: staff.full_name,
              email: emailToCheck,
              location: staff.location,
              role_tier: staff.role_tier,
              password_needs_change: false,
              is_deleted: false,
            },
          ])
          .select();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          results.push({
            email: staff.email,
            success: false,
            error: `Failed to create profile: ${profileError.message}`,
          });
          continue;
        }

        console.log('Staff member added successfully:', staff.email);
        results.push({
          email: staff.email,
          success: true,
          message: `${staff.full_name} added to roster`,
        });
      } catch (error: any) {
        console.error('Error adding staff:', error);
        results.push({
          email: staff.email,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    return Response.json(
      {
        success: results.every((r) => r.success),
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
