import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { learnFromActions } from '@/lib/memory';

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { filename, csv, rowCount, toolLog } = await req.json();
    if (!csv) {
      return Response.json({ error: 'csv is required.' }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: job, error: jobError } = await sb
      .from('jobs')
      .insert({
        user_id: userId,
        filename: filename || 'cleaned.csv',
        status: 'cleaned',
        row_count: rowCount || null,
        correction_plan: { agent_tool_log: toolLog || [] },
      })
      .select()
      .single();
    if (jobError) {
      return Response.json({ error: jobError.message }, { status: 500 });
    }

    const path = `${userId}/${job.id}.csv`;
    const { error: uploadError } = await sb.storage
      .from('cleaned-files')
      .upload(path, csv, { contentType: 'text/csv', upsert: true });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }
    await sb.from('jobs').update({ cleaned_file_path: path }).eq('id', job.id);

    // Turn the agent's tool calls into the same "actions" shape the memory
    // system already understands, so column/value corrections are remembered
    // the same way regardless of whether the wizard or the chat produced them.
    const actionsByCol = {};
    for (const t of toolLog || []) {
      if (t.tool === 'standardize_values' && t.args.column) {
        actionsByCol[t.args.column] = actionsByCol[t.args.column] || {
          column: t.args.column,
          trim: false,
          case: 'none',
          value_map: {},
        };
        Object.assign(actionsByCol[t.args.column].value_map, t.args.mapping || {});
      }
      if (t.tool === 'set_case' && t.args.column) {
        actionsByCol[t.args.column] = actionsByCol[t.args.column] || {
          column: t.args.column,
          trim: false,
          case: 'none',
          value_map: {},
        };
        actionsByCol[t.args.column].case = t.args.case;
      }
      if (t.tool === 'trim_whitespace' && t.args.column) {
        actionsByCol[t.args.column] = actionsByCol[t.args.column] || {
          column: t.args.column,
          trim: false,
          case: 'none',
          value_map: {},
        };
        actionsByCol[t.args.column].trim = true;
      }
    }
    await learnFromActions(userId, Object.values(actionsByCol));

    return Response.json({ ok: true, jobId: job.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
