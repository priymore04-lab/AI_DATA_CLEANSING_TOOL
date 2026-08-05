import { auth } from '@clerk/nextjs/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Meeting Notes API - CRUD for meeting notes
 * GET: List all meeting notes (optionally filtered by project)
 * POST: Create new meeting notes
 */

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('meeting_notes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ meetings: data || [] });
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

    const {
      project_id,
      title,
      raw_notes,
      attendees = [],
      date,
      summary,
      key_decisions,
      action_items,
      requirements_extracted,
      risks_identified,
    } = await req.json();

    if (!title || !raw_notes) {
      return Response.json(
        { error: 'Title and raw_notes are required.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('meeting_notes')
      .insert([
        {
          user_id: userId,
          project_id,
          title,
          raw_notes,
          attendees,
          date: date || new Date().toISOString(),
          summary,
          key_decisions,
          action_items,
          requirements_extracted,
          risks_identified,
        },
      ])
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ meeting: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
