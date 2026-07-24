import { auth } from '@clerk/nextjs/server';
import { TOOL_DEFS, executeTool } from '@/lib/agentTools';

const SYSTEM_PROMPT = `You are a data cleaning agent working on a CSV already loaded in memory. You have tools to inspect and modify it.

Rules:
- Always call inspect_column before proposing a standardize_values mapping -- never guess corrections without seeing the real values.
- Never invent replacement data for missing values. Only remove_rows_with_missing when the user's request implies it.
- Take as many tool-call steps as needed to fully satisfy one user request, but don't take actions the user didn't ask for.
- When you're done, reply in plain text summarizing what you did in 1-3 short, plain sentences. No markdown headers.`;

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { message, history, headers, rows } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'GROQ_API_KEY is not set on the server. Add it to .env.local and restart the dev server.' },
        { status: 500 }
      );
    }

    // A working copy the tools mutate -- the original request body is untouched.
    const state = { headers, rows: rows.map((r) => ({ ...r })) };
    const toolLog = [];

    let messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message },
    ];

    let finalReply = '';

    // The loop is what makes this an agent rather than a single call: the
    // model can inspect data, see the result, then decide on a next action,
    // repeating until it has nothing more to do (max 6 steps as a safety cap).
    for (let i = 0; i < 6; i++) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1200,
          messages,
          tools: TOOL_DEFS,
          tool_choice: 'auto',
        }),
      });

      const data = await groqRes.json();
      if (!groqRes.ok) {
        return Response.json(
          { error: data?.error?.message || 'The Groq API returned an error.' },
          { status: groqRes.status }
        );
      }

      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        messages.push(choice);
        for (const call of choice.tool_calls) {
          let args = {};
          try {
            args = JSON.parse(call.function.arguments || '{}');
          } catch (e) {
            args = {};
          }
          const result = executeTool(call.function.name, args, state);
          toolLog.push({ tool: call.function.name, args, result });
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue; // let the model see the tool results and decide what's next
      }

      finalReply = choice.content || '';
      break;
    }

    return Response.json({
      reply: finalReply || "Done — check the preview below for what changed.",
      headers: state.headers,
      rows: state.rows,
      toolLog,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
