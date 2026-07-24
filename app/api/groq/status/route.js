import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ status: 'no_auth' }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return Response.json({ status: 'no_key' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json();
    const models = d.data?.map(m => m.id).filter(id => !id.includes('whisper')) || [];
    return Response.json({ status: 'online', models });
  } catch {
    return Response.json({ status: 'error' });
  }
}
