import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient, createAdminClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get authenticated user from Clerk
    const { userId: currentUserId, getToken } = auth();
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId: targetUserId } = params;

    // Try to get Supabase access token from Clerk, with fallback to regular token
    let supabaseAccessToken;
    try {
      supabaseAccessToken = await getToken({
        template: 'supabase',
      });
    } catch (error) {
      console.warn('Supabase template not configured, using regular Clerk token');
      // Fallback: if Supabase template isn't configured, we'll still create the user profile
      // but won't use Supabase RLS - we'll rely on our own permission checks
    }

    // Create Supabase clients
    const supabase = supabaseAccessToken ? createClerkSupabaseClient(supabaseAccessToken) : null;
    const adminClient = createAdminClient();

    // Ensure the user profile exists (auto-create for Clerk users)
    await ensureUserProfile(targetUserId, adminClient);

    // Check if the current user can access this data
    // Users can only see their own access unless they're admin
    if (currentUserId !== targetUserId) {
      if (supabase) {
        const { data: currentUser } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUserId)
          .single();

        if (!currentUser?.is_admin) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      } else {
        // Without Supabase RLS, only allow users to see their own data
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch user's project access using admin client if Supabase token not available
    const clientToUse = supabase || adminClient;
    const { data: projectAccess, error } = await clientToUse
      .from('project_members')
      .select(`
        project_id,
        role,
        created_at,
        projects:project_id (
          name,
          description,
          created_by,
          owner_id
        )
      `)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error fetching project access:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project access' },
        { status: 500 }
      );
    }

    // Format response to match expected interface
    const formattedAccess = (projectAccess || []).map((access: any) => ({
      project_id: access.project_id,
      role: access.role,
      permissions: [], // Will be determined by role on frontend
      assigned_by: null, // Could add this field if needed
      assigned_at: access.created_at,
      project: access.projects
    }));

    return NextResponse.json(formattedAccess);
  } catch (error) {
    console.error('Project access API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to ensure user profile exists
async function ensureUserProfile(userId: string, adminClient: any) {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return; // Profile already exists
    }

    // Default user info for new Clerk users
    let userEmail = `${userId}@clerk.user`;
    let userName = 'New User';

    // Try to get better user info if we can access Clerk's user data
    // In a production app, you might want to get this from Clerk's API
    // For now, we'll create a basic profile that can be updated later

    // Create new profile for Clerk user
    // New users get 'member' role by default, which allows them to:
    // - Create their own projects (and become admin of those)
    // - Work on projects they're assigned to
    // - View analytics and users
    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail,
        name: userName,
        is_admin: false, // Global admin status (false by default)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      // Don't throw error - just log it and continue
    } else {
      console.log(`Created profile for Clerk user: ${userId} with member role`);
    }
  } catch (error) {
    console.error('Error in ensureUserProfile:', error);
    // Don't throw - just log and continue
  }
} 