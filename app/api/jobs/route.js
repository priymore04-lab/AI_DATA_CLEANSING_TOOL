import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('jobs')
    .select('id, filename, status, row_count, created_at, cleaned_file_path')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const jobs = [];
  for (const job of data) {
    let downloadUrl = null;
    if (job.cleaned_file_path) {
      const { data: signed } = await sb.storage
        .from('cleaned-files')
        .createSignedUrl(job.cleaned_file_path, 3600);
      downloadUrl = signed?.signedUrl || null;
    }
    jobs.push({ ...job, downloadUrl });
  }

  return Response.json({ jobs });
}
