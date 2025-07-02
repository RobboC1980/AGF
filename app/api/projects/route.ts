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

    // Start a transaction to create project and add creator as admin
    const { data: project, error: projectError } = await supabase
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

    if (projectError) {
      console.error('Error creating project:', projectError);
      
      if (projectError.code === '23505') {
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

    // Automatically add the creator as a project admin
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: userId,
        role: 'admin',
        created_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error adding creator as project admin:', memberError);
      // Don't fail the project creation if this fails, just log it
      console.warn(`Project ${project.id} created but creator not added as admin member`);
    } else {
      console.log(`Project creator ${userId} automatically added as admin for project ${project.id}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        creator_is_admin: !memberError // Indicate if the creator was successfully added as admin
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Project creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 