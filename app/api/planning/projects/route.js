import { auth } from '@clerk/nextjs/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Projects API - CRUD operations for project planning
 * GET: List all projects for the user
 * POST: Create a new project
 */

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ projects: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { name, description, domain, status = 'discovery' } = await req.json();

    if (!name) {
      return Response.json({ error: 'Project name is required.' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          name,
          description,
          domain,
          status,
        },
      ])
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ project: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
