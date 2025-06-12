import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic'; // No caching for always fresh data

export async function GET(request: Request) {
  try {
    // Create a Supabase client for the request
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch projects with filtering and pagination
    let query = supabase
      .from('projects')
      .select(`
        *,
        epics:epics(count),
        stories:epics(stories(count))
      `)
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add optional filters
    if (status) {
      query = query.eq('status', status);
    }

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('created_by', session.user.id);

    if (countError) {
      console.error('Count error:', countError);
    }

    // Return the projects with pagination metadata
    return NextResponse.json({
      projects,
      pagination: {
        total: totalCount || 0,
        offset,
        limit,
        hasMore: (offset + projects.length) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Create a Supabase client for the request
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Parse the request body
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Insert the new project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        created_by: session.user.id,
        status: 'active'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json(project);
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 