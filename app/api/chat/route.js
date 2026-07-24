import { auth } from '@clerk/nextjs/server';

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const { prompt, system, model } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return Response.json({ error: 'GROQ_API_KEY is not set on the server.' }, { status: 500 });

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model || 'llama-3.3-70b-versatile', messages, max_tokens: 800, temperature: 0.2 }),
    });
    const d = await r.json();
    if (!r.ok) return Response.json({ error: d?.error?.message || 'Groq API error.' }, { status: r.status });
    return Response.json({ reply: d.choices?.[0]?.message?.content || 'No response.' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
