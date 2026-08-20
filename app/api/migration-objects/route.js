import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('migration_objects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ migrationObjects: data });
}

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await req.json();
  if (!body.name) return Response.json({ error: 'name is required.' }, { status: 400 });
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('migration_objects')
    .insert({
      user_id: userId,
      name: body.name,
      description: body.description || null,
      target_fields: body.target_fields || [],
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ migrationObject: data });
}
