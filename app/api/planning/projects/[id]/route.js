import { auth } from '@clerk/nextjs/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Individual Project API - Get, Update, Delete specific project
 */

export async function GET(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { id } = params;
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: 'Project not found.' }, { status: 404 });
    }

    return Response.json({ project: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { id } = params;
    const updates = await req.json();

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
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

export async function DELETE(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { id } = params;
    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
