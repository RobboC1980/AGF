import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient } from '@/lib/supabase';

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

    // Get Supabase access token from Clerk
    const supabaseAccessToken = await getToken({
      template: 'supabase',
    });

    if (!supabaseAccessToken) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 401 }
      );
    }

    // Create Supabase client with Clerk token
    const supabase = createClerkSupabaseClient(supabaseAccessToken);

    // Check if the current user can access this data
    // Users can only see their own access unless they're admin
    if (currentUserId !== targetUserId) {
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
    }

    // Fetch user's project access
    const { data: projectAccess, error } = await supabase
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