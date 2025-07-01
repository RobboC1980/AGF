import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 🛡️ SECURITY: Authenticate with Clerk
    const { userId, getToken } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // 🛡️ SECURITY: RLS policies will automatically filter projects based on access
    const { data: projects, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { projects }
    });

  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🛡️ SECURITY: Authenticate with Clerk
    const { userId, getToken } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const projectData = await request.json();

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

    // 🛡️ SECURITY: Set owner_id and created_by to current user
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'active',
        priority: projectData.priority || 'medium',
        progress: 0,
        owner_id: userId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Project with this name already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project
    }, { status: 201 });

  } catch (error) {
    console.error('Project creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 