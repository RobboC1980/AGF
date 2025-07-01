import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // 🛡️ SECURITY: Authenticate with Clerk
    const { userId, getToken } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { projectId } = params;

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

    // 🛡️ SECURITY: RLS policies will automatically filter based on access
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        priority,
        progress,
        owner_id,
        created_by,
        created_at,
        updated_at
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project
    });

  } catch (error) {
    console.error('Project API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // 🛡️ SECURITY: Authenticate with Clerk
    const { userId, getToken } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { projectId } = params;
    const updateData = await request.json();

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

    // 🛡️ SECURITY: RLS policies will prevent unauthorized updates
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
        priority: updateData.priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project
    });

  } catch (error) {
    console.error('Project update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // 🛡️ SECURITY: Authenticate with Clerk
    const { userId, getToken } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { projectId } = params;

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

    // 🛡️ SECURITY: RLS policies will prevent unauthorized deletions
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Project delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 