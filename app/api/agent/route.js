import { auth } from '@clerk/nextjs/server';
import { TOOL_DEFS, executeTool } from '@/lib/agentTools';

function buildSystemPrompt(userRules = [], systemContext = '') {
  const activeRules = userRules.filter(r => r.active);

  const rulesSection = activeRules.length
    ? `\nUser-defined cleansing rules (use apply_rule to invoke these — prefer them over generic tools when a matching rule exists):\n${activeRules.map(r => `  - column "${r.field}" → action "${r.action}" (${r.type})`).join('\n')}`
    : '\nNo user-defined rules are active. Use the standard tools and run_transform for custom logic.';

  const contextSection = systemContext?.trim()
    ? `\nDomain context provided by the user — follow these instructions carefully:\n${systemContext.trim()}`
    : '';

  return `You are a data cleaning agent working on a CSV already loaded in memory. You have tools to inspect and modify it.

Core rules:
- Always call inspect_column before proposing a standardize_values mapping — never guess corrections without seeing the real values.
- Prefer apply_rule when a matching user-defined rule exists for the column.
- Use run_transform for any custom transformation not covered by standard tools — write a concise, safe JS expression using \`value\` as the cell string.
- Never invent replacement data for missing values. Only remove_rows_with_missing when the user explicitly asks to delete rows.
- Take as many tool-call steps as needed to fully satisfy one user request, but don't take actions the user didn't ask for.
- When you're done, reply in plain text summarising what you did in 1–3 short sentences. No markdown headers.
${rulesSection}${contextSection}`;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

    const { message, history, headers, rows, userRules = [], systemContext = '', model } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return Response.json({ error: 'GROQ_API_KEY is not set. Add it to .env.local and restart.' }, { status: 500 });

    const state = { headers, rows: rows.map(r => ({ ...r })) };
    const toolLog = [];

    const messages = [
      { role: 'system', content: buildSystemPrompt(userRules, systemContext) },
      ...(history || []),
      { role: 'user', content: message },
    ];

    let finalReply = '';

    for (let i = 0; i < 8; i++) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          max_tokens: 1500,
          messages,
          tools: TOOL_DEFS,
          tool_choice: 'auto',
        }),
      });

      const data = await groqRes.json();
      if (!groqRes.ok) return Response.json({ error: data?.error?.message || 'Groq API error.' }, { status: groqRes.status });

      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls?.length) {
        messages.push(choice);
        for (const call of choice.tool_calls) {
          let args = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
          const result = executeTool(call.function.name, args, state, userRules);
          toolLog.push({ tool: call.function.name, args, result });
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue;
      }

      finalReply = choice.content || '';
      break;
    }

    return Response.json({
      reply: finalReply || 'Done — check the preview below for what changed.',
      headers: state.headers,
      rows: state.rows,
      toolLog,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
