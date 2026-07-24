# Cleanslate — agent mode (chat-driven cleaning)

Instead of a fixed upload → analyze → review → apply wizard, you now chat with the
AI directly: upload a CSV, then type instructions like "standardize the state column"
or "remove exact duplicates". The AI inspects your data, decides which actions to take,
executes them, and tells you what it did — chaining multiple steps per request when
needed. That decide-then-act loop is what makes this an agent rather than a single
one-shot AI call.

Setup (Clerk, Supabase, Groq) is unchanged from before — if you already have all five
keys in `.env.local` working, skip to "Run it" below.

## 1. Create a Clerk account (auth)

1. Go to https://dashboard.clerk.com and sign up (free).
2. Create a new application. Any name is fine.
3. In the dashboard, go to **API Keys** and copy the **Publishable key** and
   **Secret key** — you'll paste these into `.env.local` in step 4.

## 2. Create a Supabase project (database + storage)

1. Go to https://supabase.com/dashboard and sign up (free).
2. Create a new project (pick any name/region; note the database password it
   asks you to set, though you won't need it directly for this app).
3. Once the project is ready, go to **SQL Editor** → **New query**, paste in
   the contents of `supabase-setup.sql` (included in this project), and click
   **Run**. This creates the two tables the app needs (`user_memory`, `jobs`).
4. Go to **Storage** → **Create a new bucket**. Name it exactly `cleaned-files`.
   It can be a private bucket (not public) — the app generates temporary
   signed download links instead.
5. Go to **Settings → API** and copy the **Project URL** and the
   **`service_role` key** (not the `anon` key — the service_role key is the
   one meant for trusted server-side code, which is exactly what this app is).

## 3. Get a free Groq API key (AI analysis)

Go to https://console.groq.com/keys, sign up, and create a key. Free, no
credit card. (Same as Phase 1 — skip if you already have one.)

**Trade-off to remember:** Groq's free tier is capped around 30 requests/minute
and a daily limit, shared across all your users. Fine for you and a small group;
you'd upgrade (still no minimum spend) before real public traffic.

## 4. Install Node.js (if you don't have it)

Download the LTS version from https://nodejs.org. Confirm it worked:

```
node -v
npm -v
```

## 5. Install the project's dependencies

In a terminal, inside this project folder:

```
npm install
```

This now also installs `@clerk/nextjs` and `@supabase/supabase-js` alongside
Next.js, React, and Papaparse.

## 6. Add your keys

```
cp .env.local.example .env.local
```

Open `.env.local` and fill in all five values using what you copied in steps
1–3: `GROQ_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Why some start with `NEXT_PUBLIC_` and some don't:** in Next.js, only
variables prefixed `NEXT_PUBLIC_` are ever sent to the browser (Clerk's
publishable key and Supabase's URL are *designed* to be public). Everything
else — `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` — stays
server-only. Never rename one of these to add `NEXT_PUBLIC_` "to make it work" —
if something isn't working, the fix is elsewhere, not exposing a secret key.

## 7. Run it

```
npm run dev
```

Open http://localhost:3000, sign in (Clerk shows a modal), then upload a CSV.

## How the agent actually works

`app/api/agent/route.js` is the whole thing. Each time you send a chat message:

1. Your current dataset (headers + rows) and the conversation so far go to Groq,
   along with a list of tools it's allowed to call (`lib/agentTools.js`):
   `inspect_column`, `trim_whitespace`, `set_case`, `standardize_values`,
   `remove_duplicate_rows`, `remove_rows_with_missing`, `summarize_data`.
2. The model decides whether to call a tool. If it does, the backend actually
   executes that function against your real data, and feeds the (small) result
   back to the model.
3. The model sees that result and decides what to do next — call another tool,
   or reply in plain text once it's satisfied the request is handled. This loop
   runs up to 6 steps per message, which is what lets it, say, inspect a messy
   column, decide on a correction mapping, and apply it — three steps, one
   request from you.
4. The final updated dataset and a log of every tool call are sent back to the
   browser, which updates the live preview.

Try commands like:
- "what's wrong with this data?"
- "standardize the state column"
- "remove exact duplicate rows"
- "trim whitespace from the email column and lowercase it"

**Why it still won't invent data:** the tools available to it don't include
anything like "fill in missing values" — only deletion, formatting, and
value-mapping tools exist. That boundary is enforced in code
(`lib/agentTools.js`), not just by asking nicely in the prompt — the model
literally cannot call a tool that doesn't exist.

- `app/api/jobs/save/route.js` — called when you click "Save to your account";
  uploads the current cleaned CSV to Supabase Storage, records a job, and
  converts the agent's tool history into the same corrections format the
  memory system already understands.
- `app/api/jobs/route.js` — lists your past saved jobs with download links.

## How memory works now

Same idea as before (learn corrections, reuse them next time), stored in the
`user_memory` table per Clerk user. The difference is where it comes from:
when you click "Save to your account," the agent's tool-call history
(which columns it standardized, trimmed, or case-normalized, and with what
mapping) is converted into the same format the memory system always used, so
future chat sessions reuse decisions from past ones — including, currently,
starting a session by asking the agent to check `inspect_column` against
values it's corrected before.

## What's still missing before this is a public product

- **Usage limits / billing** — nothing stops a signed-in user from running
  unlimited analyses; add a `usage` table and caps before opening this up
  widely, since each analysis costs a Groq API call
- **Bigger file handling** — everything still runs in-browser and in a single
  request; very large CSVs will need streaming/chunking
- **Deployment** — this runs locally so far; deploying to Vercel is the next
  concrete step once you're happy with how this behaves, and is a good next
  focused session on its own
