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

    // Try to get Supabase access token from Clerk, with fallback
    let supabaseAccessToken;
    try {
      supabaseAccessToken = await getToken({
        template: 'supabase',
      });
    } catch (error) {
      console.warn('Supabase template not configured, proceeding without RLS');
    }

    // Create Supabase client with Clerk token (if available)
    const supabase = supabaseAccessToken ? createClerkSupabaseClient(supabaseAccessToken) : null;

    // Check if the current user can access this data
    // Users can only see their own memberships unless they're admin
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

    // For now, return empty array since we don't have teams implemented yet
    // In the future, this would fetch from a teams table
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