import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('rules').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ rules: data });
}

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('rules').insert({ user_id: userId, field: body.field, type: body.type, action: body.action, expression: body.expression || null, description: body.description || null, active: body.active ?? true }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ rule: data });
}
