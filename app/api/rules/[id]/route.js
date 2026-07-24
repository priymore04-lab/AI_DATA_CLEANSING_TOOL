import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req, { params }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await req.json();
  const sb = supabaseAdmin();
  const allowed = ['field','type','action','expression','description','active'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await sb.from('rules').update(updates).eq('id', params.id).eq('user_id', userId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ rule: data });
}

export async function DELETE(_, { params }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const sb = supabaseAdmin();
  const { error } = await sb.from('rules').delete().eq('id', params.id).eq('user_id', userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
