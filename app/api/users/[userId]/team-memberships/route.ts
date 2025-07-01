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
    // Users can only see their own memberships unless they're admin
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

    // For now, return empty array since teams functionality isn't implemented yet
    // This prevents the RBAC hook from failing while we focus on project-level access
    const teamMemberships: any[] = [];

    return NextResponse.json(teamMemberships);
  } catch (error) {
    console.error('Team memberships API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 