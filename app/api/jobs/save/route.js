import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { learnFromActions } from '@/lib/memory';

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { filename, status, headers, rows, meta } = await req.json();
    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      return Response.json({ error: 'headers and rows are required.' }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: job, error: jobError } = await sb
      .from('jobs')
      .insert({
        user_id: userId,
        filename: filename || 'data.csv',
        status: status || 'uploaded',
        row_count: rows.length,
        correction_plan: meta || null,
        data: { headers, rows },
      })
      .select()
      .single();
    if (jobError) {
      return Response.json({ error: jobError.message }, { status: 500 });
    }

    // Turn the AI Cleanse agent's tool calls into the same "actions" shape the
    // memory system already understands, so column/value corrections are
    // remembered the same way regardless of whether the wizard or the chat
    // produced them.
    if (status === 'ai_cleaned' && meta?.toolLog?.length) {
      const actionsByCol = {};
      for (const t of meta.toolLog) {
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
    }

    return Response.json({ ok: true, jobId: job.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
