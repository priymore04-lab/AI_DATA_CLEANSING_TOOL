# Project Charter — DataCleanseAI (cleanslate-nextjs)

## 1. Business Need

Analysts, ops teams, and small business users routinely receive messy CSV/Excel/JSON
data (inconsistent formatting, duplicates, missing values, mixed types) that must be
cleaned before it can be trusted for reporting or downstream systems. Today this work
is done by hand in spreadsheets or with one-off Python/Excel scripts — slow, error-prone,
and not repeatable across similar files.

DataCleanseAI addresses this by letting a user upload a file and either apply
deterministic cleaning rules or describe what they want in plain language to an
AI agent that inspects the data and performs the cleanup, with every change logged
for audit. The need is a faster, more accessible, and more auditable path from
"messy file" to "clean, trustworthy dataset."

## 2. Project Goals

- Let a non-technical user upload a spreadsheet and get a materially cleaner
  version out, without writing code.
- Give power users a rules engine (manual + AI-suggested) they can inspect,
  edit, and re-run, rather than a black-box transform.
- Make every change traceable: profiling stats before/after, and an audit log
  of what was changed and why.
- Support duplicate detection via fuzzy matching, not just exact-match dedup.
- Keep a record of past cleaning jobs so results and rules can be revisited
  or reused.

Non-goals (explicitly out of scope for now, per current README): usage limits/
billing, large-file streaming for datasets that don't fit in one request, and
production deployment/hosting.

## 3. Current State (as of 2026-08-04)

The app is a working **prototype/MVP**, not yet a public product:

- **Stack**: Next.js 14 (App Router), Clerk (auth), Supabase (Postgres + storage),
  Groq (Llama 3.3 inference via plain fetch, no SDK).
- **Surface**: one main page (`app/page.js`) with 9 tabs — Guides, Ingest, Profile,
  Rules, Cleanse (AI chat agent + local rule engine), Audit, Fuzzy Dedup, Database,
  Groq Setup — and 7 API routes.
- **Data layer**: 3 Supabase tables (`user_memory`, `jobs`, `rules`) created via a
  single hand-run SQL script; access control lives in the API routes, not Postgres RLS.
- **Gaps called out in the existing README**: no usage limits or billing (a signed-in
  user can call the Groq API without limit), no chunking/streaming for large files
  (everything processes in one request), no automated tests, and no deployment target
  configured yet (local dev only).

## 4. Scope, Cost, Timeline, and Resources (Estimate)

These are rough, unvalidated estimates for taking the app from current prototype
to a small, safely-deployed product for a limited user base. They should be
revisited once real usage patterns and target user count are known.

| Phase | Scope | Effort (1 engineer) | Notes |
|---|---|---|---|
| Harden data layer | Add Postgres RLS, migration tooling (e.g. Prisma/Drizzle) instead of hand-run SQL | 1–2 weeks | Currently a single risk: schema drift and no row-level security |
| Usage limits / cost control | Per-user Groq call quotas, file-size caps, basic abuse protection | 1 week | Groq usage is currently unbounded per user — direct cost exposure |
| Large-file handling | Chunked/streamed processing for files beyond current in-memory limit | 2–3 weeks | Depends on target max file size |
| Testing | Unit tests for rule engine + API routes, basic e2e for upload→clean→save flow | 1–2 weeks | No tests exist today |
| Deployment | Vercel (or similar) deployment, env/secrets management, monitoring | 3–5 days | No hosting config currently checked in |
| **Total (MVP → deployable product)** | | **~5–8 weeks**, 1 engineer | Assumes no major feature additions beyond hardening |

**Ongoing costs** once deployed: Groq API usage (variable, scales with active
users and file volume), Supabase plan tier (DB + storage), Clerk plan tier
(scales with MAUs), hosting (Vercel or equivalent).

**Resources needed**: 1 full-stack engineer (Next.js/Postgres) is sufficient for
the hardening phases above. AI/prompt tuning for the cleaning agent may benefit
from a second reviewer familiar with the target data domain (e.g. finance, ops)
to validate cleaning quality, but is not a hard blocker.

## 5. Stakeholders and Constraints

**Stakeholders**
- Product owner — sets priority between hardening vs. new features (rules coverage,
  additional file formats, etc.)
- End users — data analysts/ops staff who upload and clean files; their trust in
  the audit log and profiling stats is central to adoption.
- Whoever owns the Groq/Supabase/Clerk accounts — bears direct cost exposure from
  unlimited usage until quotas are added.

**Constraints**
- **Cost exposure**: Groq calls are currently unmetered per user — this is the
  most time-sensitive constraint before any wider rollout.
- **Data sensitivity**: uploaded files may contain PII or business-sensitive data;
  Supabase access is currently enforced at the API layer only (no RLS), which is
  a constraint on how broadly this can be trusted with sensitive data pre-hardening.
- **No automated tests**: any change to the rule engine or agent tool-calling logic
  currently carries regression risk with no safety net.
- **Single-page architecture**: the whole app UI lives in one client component
  (`app/page.js`); this simplifies the MVP but will need decomposition before
  adding significant new surface area.
