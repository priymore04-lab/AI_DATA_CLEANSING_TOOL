# Technical Specification Document
## SAP AI Data Cleansing Tool — DataCleanseAI

**Version:** 1.0  
**Project:** SAP AI Data Cleansing Tool  
**Repository:** https://git.epam.com/priyankanavnath_more/sap_ai_data_cleansing_tool  
**Framework:** Next.js 14 (App Router)  
**Prepared by:** Priyanka Navnath More  
**Date:** June 2025  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [External Services & Integrations](#4-external-services--integrations)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [Frontend Modules](#7-frontend-modules)
8. [Core Libraries & Logic](#8-core-libraries--logic)
9. [AI Agent Architecture](#9-ai-agent-architecture)
10. [Security & Authentication](#10-security--authentication)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [File Structure](#12-file-structure)
13. [Environment Configuration](#13-environment-configuration)
14. [Feature Specifications](#14-feature-specifications)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Limitations & Known Constraints](#16-limitations--known-constraints)

---

## 1. Project Overview

### 1.1 Purpose
**DataCleanseAI** is a full-stack, AI-powered data quality and cleansing web application. It enables users to upload messy datasets (CSV, Excel, JSON), automatically detect data quality issues, apply rule-based or AI-driven cleansing, detect duplicates, and export clean data — all through a modern browser-based interface.

### 1.2 Target Use Case
The tool is specifically designed for SAP and enterprise data management scenarios — helping data stewards, analysts, and system owners clean master data (Customer, Product, Address, Material) before loading it into SAP or other ERP systems.

### 1.3 Core Capabilities

| Capability | Description |
|---|---|
| **Data Ingestion** | Upload CSV, Excel (.xlsx/.xls), JSON or use built-in sample datasets |
| **Data Profiling** | Automatic column-level quality analysis (fill rate, uniqueness, issues) |
| **Rule-Based Cleansing** | Configurable field-level cleansing rules (trim, case, normalize, custom JS) |
| **AI Cleansing Agent** | Natural-language Groq LLM agent with tool-calling to transform datasets |
| **Duplicate Detection** | Exact and fuzzy (Levenshtein + Token) duplicate detection and removal |
| **Audit Trail** | Full change log with timestamps, before/after values, confidence scores |
| **Job History** | Persistent storage of completed cleanse jobs with download links |
| **Memory System** | Learns from past corrections to apply consistent fixes on future datasets |

---

## 2. System Architecture

### 2.1 Architecture Pattern
The application follows a **Monolithic Next.js App Router** architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                        │
│  React SPA — app/page.js (single 'use client' component)    │
│  Local Logic: Papa Parse, Rule Engine, Dedup, Profiling     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────┐
│              NEXT.JS SERVER (Route Handlers)                 │
│  app/api/agent/route.js      ← AI Agentic Loop              │
│  app/api/chat/route.js       ← One-shot LLM Chat            │
│  app/api/rules/route.js      ← Rules CRUD                   │
│  app/api/jobs/route.js       ← Job History                  │
│  app/api/jobs/save/route.js  ← Save & Learn                 │
│  app/api/groq/status/route.js← Health Check                 │
└────────┬──────────────────────┬───────────────────────────┬─┘
         │                      │                           │
┌────────▼──────┐   ┌───────────▼────────┐   ┌─────────────▼──┐
│  CLERK AUTH   │   │   GROQ LLM API     │   │   SUPABASE     │
│  (Identity)   │   │   (LLM Inference)  │   │  (DB + Storage)│
│  Middleware   │   │  Llama 3.3 / etc.  │   │  PostgreSQL    │
└───────────────┘   └────────────────────┘   └────────────────┘
```

### 2.2 Request Lifecycle
1. Browser makes an API call (e.g., POST `/api/agent`)
2. `middleware.js` intercepts and validates Clerk session
3. Route Handler extracts `userId` from `auth()` — rejects with `401` if not authenticated
4. Business logic executes (Groq call, Supabase query, etc.)
5. Response returned as `Response.json()`

---

## 3. Technology Stack

### 3.1 Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14 (App Router) | React meta-framework, SSR, Route Handlers |
| **React** | 18 | UI library |
| **PapaParse** | latest | CSV parsing and export |
| **CSS Variables** | Native | Design system (no CSS-in-JS framework) |
| **Google Fonts** | IBM Plex Mono, Syne | Typography |

### 3.2 Backend (API Routes)
| Technology | Purpose |
|---|---|
| **Next.js Route Handlers** | Server-side API endpoints (no separate backend) |
| **Node.js `fetch`** | HTTP calls to Groq API |

### 3.3 AI / LLM
| Technology | Purpose |
|---|---|
| **Groq API** | Fast LLM inference (OpenAI-compatible) |
| **Llama 3.3 70B Versatile** | Default model (recommended) |
| **Llama 3.1 8B Instant** | Low-latency alternative |
| **Llama3-70B-8192** | Complex reasoning |
| **Mixtral 8x7B-32768** | Large context window |
| **Gemma2-9B-IT** | Efficient Google model |

### 3.4 Authentication
| Technology | Purpose |
|---|---|
| **Clerk** | Authentication, session management, user identity |
| `@clerk/nextjs` | Next.js SDK with `ClerkProvider`, `auth()`, `SignInButton`, `UserButton` |

### 3.5 Database & Storage
| Technology | Purpose |
|---|---|
| **Supabase** | Managed PostgreSQL database + file storage |
| **Supabase Admin Client** | Server-side access with `service_role` key |
| **Supabase Storage** | `cleaned-files` bucket for exported CSVs |

---

## 4. External Services & Integrations

### 4.1 Clerk Authentication
- **Role:** User identity, session management, access gating
- **Integration Points:**
  - `middleware.js` — wraps all routes with `clerkMiddleware()`
  - `app/layout.js` — wraps app in `<ClerkProvider>`
  - Every API route — calls `await auth()` for `userId`
- **UI Components:** `<SignedIn>`, `<SignedOut>`, `<SignInButton>`, `<UserButton>`
- **Session Flow:** Clerk session → `userId` → used as primary key for all user data

### 4.2 Groq API
- **Role:** Fast LLM inference for AI cleansing agent and rule suggestions
- **Base URL:** `https://api.groq.com/openai/v1/`
- **Endpoints Used:**
  - `POST /chat/completions` — main LLM call (with and without tools)
  - `GET /models` — health check / model listing
- **Authentication:** `Authorization: Bearer GROQ_API_KEY`
- **Configuration:**
  - `max_tokens: 1500` for agent, `800` for chat
  - `temperature: 0.2` for rule suggestions
  - `tool_choice: 'auto'` for agentic loop
- **Models Available:** 5 curated models in the UI dropdown

### 4.3 Supabase
- **Role:** PostgreSQL database and file storage
- **Client Type:** Admin client (service_role key — bypasses RLS)
- **Access Control:** All queries filtered by `user_id` from Clerk session (application-layer security)
- **Storage Bucket:** `cleaned-files` — stores exported cleaned CSVs
- **Signed URLs:** 1-hour expiry for download links

---

## 5. Database Schema

### 5.1 Table: `rules`
Stores user-defined data cleansing rules.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated primary key |
| `user_id` | TEXT | Clerk user ID (foreign reference) |
| `field` | TEXT | Target column name |
| `type` | TEXT | Human-readable rule label |
| `action` | TEXT | Cleanse action (see Action Vocabulary) |
| `expression` | TEXT (nullable) | JS expression for `custom` action |
| `description` | TEXT (nullable) | Rule description |
| `active` | BOOLEAN | Whether rule is applied during cleansing |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Index:** `rules_user_id_idx` on `(user_id, created_at)`

---

### 5.2 Table: `jobs`
Stores metadata for each completed cleanse job.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | TEXT | Clerk user ID |
| `filename` | TEXT | Original filename |
| `status` | TEXT | `uploaded`, `cleaned` |
| `row_count` | INT | Number of data rows |
| `correction_plan` | JSONB | Agent tool log (`{agent_tool_log: [...]}`) |
| `cleaned_file_path` | TEXT | Path in Supabase Storage |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Index:** `jobs_user_id_idx` on `(user_id, created_at DESC)`

---

### 5.3 Table: `user_memory`
Stores learned corrections per user across sessions.

| Column | Type | Description |
|---|---|---|
| `user_id` | TEXT (PK) | Clerk user ID |
| `column_settings` | JSONB | Per-column trim/case preferences |
| `value_corrections` | JSONB | Raw-value → corrected-value mappings |
| `updated_at` | TIMESTAMPTZ | Last updated timestamp |

---

### 5.4 Table: `projects` *(Planning Module)*
Stores AI-estimated project metadata.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | TEXT | Clerk user ID |
| `name` | TEXT | Project name |
| `description` | TEXT | Project description |
| `status` | TEXT | `discovery`, `planning`, `in-progress`, `completed`, `on-hold` |
| `estimated_effort_hours` | NUMERIC | AI-generated effort estimate |
| `estimated_cost` | NUMERIC | Estimated cost |
| `estimated_duration_weeks` | NUMERIC | Timeline estimate |
| `confidence_score` | NUMERIC | 0.0–1.0 confidence in estimate |
| `domain` | TEXT | Project domain (e.g., `data-cleansing`) |
| `tech_stack` | JSONB | Array of technology names |
| `team_size` | INTEGER | Recommended team size |
| `effort_breakdown` | JSONB | Phase-level hours breakdown |
| `risk_analysis` | JSONB | Array of risk objects |
| `similar_projects` | JSONB | Past similar projects for comparison |

---

### 5.5 Table: `meeting_notes` *(Planning Module)*
Stores AI-analyzed stakeholder meeting notes.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | TEXT | Clerk user ID |
| `project_id` | UUID (FK) | References `projects.id` |
| `title` | TEXT | Meeting title |
| `date` | TIMESTAMPTZ | Meeting date |
| `attendees` | TEXT[] | List of attendees |
| `raw_notes` | TEXT | Original transcript |
| `summary` | TEXT | AI-generated executive summary |
| `key_decisions` | JSONB | Decisions with owner and deadline |
| `action_items` | JSONB | Tasks with assignee and priority |
| `requirements_extracted` | JSONB | Functional/non-functional requirements |
| `risks_identified` | JSONB | Risks mentioned in discussion |

---

### 5.6 Table: `risk_library`
Pre-populated and user-defined risk catalog.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | TEXT (nullable) | NULL = global risk |
| `risk_category` | TEXT | `technical`, `resource`, `schedule`, `cost`, `external` |
| `risk_title` | TEXT | Risk name |
| `likelihood` | TEXT | `low`, `medium`, `high` |
| `impact` | TEXT | `low`, `medium`, `high`, `critical` |
| `mitigation_strategy` | TEXT | How to mitigate |
| `contingency_plan` | TEXT | Fallback approach |
| `applicable_domains` | TEXT[] | Where this risk applies |
| `tags` | TEXT[] | Searchable labels |

---

### 5.7 Table: `project_templates`
Reusable templates for common project types.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | TEXT (nullable) | NULL = global template |
| `name` | TEXT | Template name |
| `domain` | TEXT | Project domain |
| `typical_effort_hours` | NUMERIC | Typical effort |
| `typical_duration_weeks` | NUMERIC | Typical timeline |
| `phase_breakdown` | JSONB | Phase % breakdown |
| `common_risks` | JSONB | Commonly associated risks |

---

## 6. API Specification

### 6.1 `POST /api/agent`
**Purpose:** Agentic AI data cleansing loop with tool-calling.  
**Auth:** Required (Clerk session)

**Request Body:**
```json
{
  "message": "string — user's natural language instruction",
  "history": "array — prior conversation messages [{role, content}]",
  "headers": "array — column names",
  "rows": "array — dataset as array of objects [{col: val}]",
  "userRules": "array — active user-defined rules",
  "systemContext": "string — user's domain context",
  "model": "string — Groq model ID"
}
```

**Response Body:**
```json
{
  "reply": "string — AI response text",
  "headers": "array — updated column names",
  "rows": "array — updated dataset rows",
  "toolLog": "array — [{tool, args, result}]"
}
```

**Behavior:**
- Builds a dynamic system prompt including user rules and domain context
- Calls Groq in a loop (max 8 iterations)
- Executes tool calls via `executeTool()` and feeds results back to Groq
- Returns mutated dataset + final text reply

---

### 6.2 `POST /api/chat`
**Purpose:** One-shot Groq LLM completion for rule generation.  
**Auth:** Required

**Request Body:**
```json
{
  "prompt": "string",
  "system": "string — system prompt",
  "model": "string — Groq model ID",
  "history": "array — [{role, content}]"
}
```

**Response Body:**
```json
{
  "reply": "string — LLM response text"
}
```

---

### 6.3 `GET /api/rules`
**Purpose:** Fetch all cleansing rules for the signed-in user.  
**Auth:** Required

**Response Body:**
```json
{
  "rules": [
    {
      "id": "uuid",
      "user_id": "string",
      "field": "string",
      "type": "string",
      "action": "string",
      "expression": "string|null",
      "description": "string|null",
      "active": "boolean",
      "created_at": "timestamp"
    }
  ]
}
```

---

### 6.4 `POST /api/rules`
**Purpose:** Create a new cleansing rule.  
**Auth:** Required

**Request Body:**
```json
{
  "field": "string",
  "type": "string",
  "action": "string",
  "expression": "string (optional)",
  "description": "string (optional)",
  "active": "boolean"
}
```

---

### 6.5 `PATCH /api/rules/[id]`
**Purpose:** Update a specific rule (field/type/action/expression/description/active).  
**Auth:** Required — enforces `user_id` ownership

**Allowed update fields:** `field`, `type`, `action`, `expression`, `description`, `active`

---

### 6.6 `DELETE /api/rules/[id]`
**Purpose:** Delete a specific rule.  
**Auth:** Required — enforces `user_id` ownership

---

### 6.7 `GET /api/jobs`
**Purpose:** List saved cleanse jobs with signed download URLs.  
**Auth:** Required

**Response Body:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "filename": "string",
      "status": "string",
      "row_count": "number",
      "created_at": "timestamp",
      "downloadUrl": "string|null (1-hour signed URL)"
    }
  ]
}
```

---

### 6.8 `POST /api/jobs/save`
**Purpose:** Save a cleaned dataset to Supabase Storage and persist job metadata.  
**Auth:** Required

**Request Body:**
```json
{
  "filename": "string",
  "csv": "string — CSV text content",
  "rowCount": "number",
  "toolLog": "array — agent tool call log"
}
```

**Side Effects:**
- Uploads CSV to `cleaned-files` Supabase bucket
- Inserts record into `jobs` table
- Calls `learnFromActions()` to persist corrections to `user_memory`

---

### 6.9 `GET /api/groq/status`
**Purpose:** Check Groq API connectivity and list available models.  
**Auth:** Required

**Response Body:**
```json
{
  "status": "online | no_key | error | no_auth",
  "models": ["array of model IDs (when online)"]
}
```

---

## 7. Frontend Modules

### 7.1 Application Shell
- **File:** `app/layout.js`
- **Role:** Root HTML shell, wraps app in `<ClerkProvider>`, imports `globals.css`
- **Middleware:** `middleware.js` — `clerkMiddleware()` applied to all routes

### 7.2 Main Page Component
- **File:** `app/page.js`
- **Type:** `'use client'` — single-page React component
- **State Management:** React `useState` (no Redux or external state library)

### 7.3 Tab Structure

| Tab Key | Label | Description |
|---|---|---|
| `guides` | 📖 Guides | Getting-started tutorial cards with voting |
| `ingest` | 📂 Ingest | File upload (drag/drop) or sample data load |
| `profile` | 🔍 Profile | Column-level data quality profiling |
| `rules` | ⚙️ Rules | CRUD rule management + AI Rule Advisor chat |
| `cleanse` | ⚡ AI Cleanse | Groq AI agent chat + optional rule-based cleanse |
| `audit` | 📋 Audit Log | Full change/issue log from rule-based cleanse |
| `dedup` | 🔁 Duplicates | Exact + fuzzy duplicate detection and removal |
| `db` | 🗄️ Database | Saved job history with downloads |
| `setup` | 🤖 Groq Setup | API status, model selection, domain context |

### 7.4 Key State Variables

| State Variable | Type | Purpose |
|---|---|---|
| `rawData` | `{headers, rows}` | Currently loaded dataset |
| `cleanedData` | Array | Results of rule-based cleanse |
| `auditEntries` | Array | Change/issue log entries |
| `rules` | Array | User's active cleansing rules |
| `profileData` | Array | Column profiling cards |
| `cleanseMsgs` | Array | AI Cleanse chat messages |
| `rulesMsgs` | Array | AI Rule Advisor chat messages |
| `agentHistory` | Array | Conversation history for agent |
| `dedupResults` | Object | Fuzzy dedup pair results |
| `dedupPreview` | Object | Exact dedup preview state |
| `dqScore` | Number | Data quality score (0–100) |
| `currentModel` | String | Selected Groq model ID |
| `systemContext` | String | User's domain context text |
| `groqStatus` | String | `online|offline|no_key|checking` |

### 7.5 Design System
- **File:** `app/globals.css`
- **Pattern:** Pure CSS with custom properties (CSS variables)
- **Color Palette:**

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0a0c10` | Page background |
| `--surf` | `#111418` | Card/panel surface |
| `--grn` | `#00e5a0` | Primary accent, success |
| `--blu` | `#3b82f6` | Info, links |
| `--warn` | `#f59e0b` | Warnings |
| `--red` | `#ef4444` | Errors, destructive |
| `--pur` | `#8b5cf6` | Secondary accent |
| `--txt` | `#e8eaf0` | Primary text |
| `--mut` | `#6b7280` | Muted text |

- **Typography:** `IBM Plex Mono` (monospace), `Syne` (sans-serif)
- **Layout:** CSS Grid (`250px sidebar + 1fr main`)

---

## 8. Core Libraries & Logic

### 8.1 `lib/agentTools.js`

**Purpose:** Shared data transformation logic used by both client (rule engine) and server (AI agent).

#### COUNTRY_MAP
A lookup table mapping common country name variants and codes to standardized names (e.g., `'in' → 'India'`, `'usa' → 'United States'`).

#### `applyAction(action, val, expression)`
Pure function implementing all rule actions:

| Action | Behavior |
|---|---|
| `trim` | Remove leading/trailing whitespace |
| `title_case` | Capitalize first letter of each word |
| `upper_case` | Convert to uppercase |
| `lower_case` | Convert to lowercase |
| `validate_email` | Lowercase, fix `@@`, remove spaces |
| `normalize_phone` | Strip non-digits, remove country prefix (91/0) |
| `std_country` | Lookup in COUNTRY_MAP or title-case fallback |
| `title_case_city` | Capitalize first letter only |
| `std_state_code` | Uppercase if ≤3 chars, else title-case |
| `normalize_currency` | Strip all non-numeric except decimal |
| `normalize_decimal` | Parse float, strip currency symbols |
| `remove_special` | Remove non-word/space/hyphen/dot chars |
| `custom` | Execute user-provided JS expression |

#### `TOOL_DEFS`
OpenAI-compatible function-calling schema array sent to Groq for agent calls. Defines 9 tools:
- `summarize_data` — dataset summary
- `inspect_column` — sample values + missing count
- `trim_whitespace` — trim all values in a column
- `set_case` — normalize case (`title|upper|lower`)
- `standardize_values` — replace values using a mapping
- `apply_rule` — apply a user-defined rule
- `run_transform` — custom JS expression per cell
- `remove_duplicate_rows` — exact dedup
- `remove_rows_with_missing` — delete rows with empty column

#### `executeTool(name, args, state, userRules)`
Executes a Groq-chosen tool against `state.rows` (mutable in-place).

**Security in `run_transform`:** `runExpression()` blocks dangerous tokens before `new Function()` evaluation:
- Blocked: `require(`, `import(`, `process.`, `__dirname`, `eval(`, `Function(`, `fetch(`, `XMLHttpRequest`

---

### 8.2 `lib/memory.js`

**Purpose:** Per-user persistent learning from past corrections.

| Function | Description |
|---|---|
| `loadMemory(userId)` | Reads `user_memory` row from Supabase |
| `saveMemory(userId, memory)` | Upserts `user_memory` row |
| `learnFromActions(userId, actions)` | Merges tool log corrections into memory |
| `applyMemoryToAnalysis(analysis, summaries, memory)` | Pre-fills known fixes into a new analysis |

**Memory Structure:**
```json
{
  "columnSettings": {
    "Name": { "trim": true, "case": "title" }
  },
  "valueCorrections": {
    "INDIA": "India",
    "in": "India"
  }
}
```

---

### 8.3 Client-Side Algorithms

#### Data Profiling (`runProfile`)
For each column:
- **Fill rate** = `(non-empty rows / total rows) × 100`
- **Empty count** = rows where cell is empty string
- **Unique count** = `Set(non-empty values).size`
- **Issues detected:** Invalid email (no `@`), short phone (<10 digits), mixed casing

#### Confidence Scoring (`cleanseRow`)
| Issues | Confidence | Status |
|---|---|---|
| 0 | 0.97 | `ok` |
| 1 | 0.78 | `fixed` |
| 2 | 0.58 | `review` |
| 3+ | 0.38 | `review` |

#### DQ Score
```
DQ Score = ((total records - review records) / total records) × 100
```

#### Fuzzy Dedup Algorithms
- **Levenshtein:** Edit distance-based similarity = `1 - distance/max(lenA, lenB)`
- **Token:** Word-overlap similarity = `intersection / union of word sets`
- **Combined (default):** Average of Levenshtein + Token similarity

#### Auto-Actions (`autoActions`)
Automatically suggests actions based on column name patterns:

| Column Pattern | Suggested Actions |
|---|---|
| `name`, `first_name`, `last_name` | `trim`, `title_case` |
| `email`, `mail` | `trim`, `validate_email` |
| `phone`, `mobile`, `tel` | `trim`, `normalize_phone` |
| `country` | `trim`, `std_country` |
| `city` | `trim`, `title_case_city` |
| `state`, `province` | `trim`, `std_state_code` |
| `price`, `cost`, `amount` | `trim`, `normalize_currency` |

---

## 9. AI Agent Architecture

### 9.1 Agent Loop (`/api/agent`)

```
User Message
     │
     ▼
Build System Prompt
(includes: user rules, domain context, dataset flag)
     │
     ▼
Send to Groq (with TOOL_DEFS, tool_choice: 'auto')
     │
     ├── Tool Call Response?
     │         │ YES
     │         ▼
     │    executeTool() → mutate state.rows
     │    Append tool result as role:'tool' message
     │    Loop back to Groq (max 8 iterations)
     │
     └── Text Response?
               │ YES
               ▼
          Return final reply + updated dataset
```

### 9.2 System Prompt Construction
The system prompt dynamically includes:
1. **Fixed instructions:** Response format, behavior guidelines
2. **Dataset context:** Whether a dataset is loaded (enables/disables tools)
3. **User rules:** Active cleansing rules (instructs agent to prefer `apply_rule`)
4. **Domain context:** User-provided domain-specific instructions (from Setup tab)

### 9.3 Rule Suggestion Flow (`/api/chat`)
```
User request ("analyze data and suggest rules")
     │
     ▼
Build system prompt with column profiles and existing rules
     │
     ▼
One-shot Groq call (no tools)
     │
     ▼
Parse JSON array from ``` json ... ``` block in response
     │
     ▼
Display suggestions → User confirms
     │
     ▼
POST each rule to /api/rules (saved to Supabase)
```

### 9.4 Conversation Memory
- **Agent chat:** `agentHistory` array passed on every request (full conversation context)
- **Rules chat:** `rulesHistory` array passed on every request
- **Cross-session:** Agent tool corrections persisted to `user_memory` via `learnFromActions`

---

## 10. Security & Authentication

### 10.1 Authentication Flow
1. `middleware.js` applies `clerkMiddleware()` globally
2. Every API route calls `await auth()` to get `userId`
3. If `userId` is null → return `401 Unauthorized`
4. All database queries include `.eq('user_id', userId)` filter

### 10.2 Data Isolation
- All Supabase queries are scoped to the authenticated user's `user_id`
- No Row-Level Security (RLS) in Postgres — enforced at application layer
- Supabase admin client uses `service_role` key — only used server-side

### 10.3 Code Execution Security (`run_transform`)
The AI agent can generate and execute JavaScript expressions. Security controls:
- Blocklist of dangerous tokens checked before `new Function()` execution
- `"use strict"` enforced in all evaluated expressions
- Only `value` (the cell string) is in scope — no environment access
- Failed expressions return an error without modifying the dataset

### 10.4 Environment Secrets
| Secret | Location | Exposure |
|---|---|---|
| `GROQ_API_KEY` | `.env.local` | Server-only (never sent to browser) |
| `CLERK_SECRET_KEY` | `.env.local` | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Server-only |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Public (browser-safe) |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Public (browser-safe) |

---

## 11. Data Flow Diagrams

### 11.1 AI Cleanse Flow
```
Browser                    /api/agent              Groq API          Supabase
   │                           │                       │                 │
   │── POST (message, rows) ──►│                       │                 │
   │                           │── chat/completions ──►│                 │
   │                           │◄── tool_call ─────────│                 │
   │                           │── executeTool() ──────►(state.rows)     │
   │                           │── tool result ────────►│                │
   │                           │◄── text reply ─────────│                │
   │◄── {reply, rows, toolLog}─│                       │                 │
   │                           │                       │                 │
   │── POST /api/jobs/save ────►│                       │                 │
   │                           │── upload CSV ──────────────────────────►│
   │                           │── insert job ──────────────────────────►│
   │                           │── learnFromActions ────────────────────►│
```

### 11.2 Rule-Based Cleanse Flow (Client-Only)
```
rawData.rows
     │
     ▼
For each row:
  cleanseRow(row, headers, rules)
     │
     ├── autoActions(column) → built-in actions
     ├── user rules (active, matching field) → additional actions
     │
     ▼
  applyAction(action, cellValue) for each action
     │
     ▼
  Score confidence → assign status (ok/fixed/review)
     │
     ▼
cleanedData[], auditEntries[] → DQ Score calculation
```

### 11.3 Duplicate Detection Flow
```
Exact Mode:
  rawData.rows
       │
       ▼
  Key = join(selected columns) per row
       │
       ▼
  Map(key → firstIndex) — detect duplicates
       │
       ▼
  Preview (highlight duplicates) → User confirms → Remove

Fuzzy Mode:
  rawData.rows (pairwise comparison)
       │
       ▼
  For each (row i, row j):
    stringSim(rowI[col], rowJ[col], algo) per selected column
    overall = average similarity
    if overall >= threshold → add to pairs
       │
       ▼
  Display pairs table (no auto-removal)
```

---

## 12. File Structure

```
cleanslate/
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   └── route.js          ← AI agent loop endpoint
│   │   ├── chat/
│   │   │   └── route.js          ← One-shot LLM endpoint
│   │   ├── groq/
│   │   │   └── status/
│   │   │       └── route.js      ← Groq health check
│   │   ├── jobs/
│   │   │   ├── route.js          ← List saved jobs
│   │   │   └── save/
│   │   │       └── route.js      ← Save cleaned job
│   │   ├── planning/
│   │   │   ├── agent/
│   │   │   │   └── route.js      ← Planning AI agent
│   │   │   ├── meetings/
│   │   │   │   └── route.js      ← Meeting notes CRUD
│   │   │   └── projects/
│   │   │       ├── route.js      ← Project CRUD
│   │   │       └── [id]/
│   │   │           └── route.js  ← Project by ID
│   │   ├── rules/
│   │   │   ├── route.js          ← Rules GET/POST
│   │   │   └── [id]/
│   │   │       └── route.js      ← Rules PATCH/DELETE
│   ├── globals.css               ← Design system (CSS variables)
│   ├── layout.js                 ← Root layout + ClerkProvider
│   └── page.js                   ← Main SPA component
│
├── lib/
│   ├── agentTools.js             ← Tool defs, executeTool, applyAction
│   ├── memory.js                 ← User correction memory (Supabase)
│   ├── planningTools.js          ← Planning module tools
│   └── supabaseAdmin.js          ← Supabase singleton client
│
├── docs/
│   ├── CODE_OVERVIEW.md          ← Developer walkthrough
│   ├── PLANNING_MODULE.md        ← Planning module docs
│   ├── PROJECT_CHARTER.md        ← Project charter
│   └── TECHNICAL_SPECIFICATION.md ← This document
│
├── middleware.js                  ← Clerk auth middleware
├── supabase-setup.sql             ← Core DB schema
├── planning-setup.sql             ← Planning module schema
├── package.json                   ← Dependencies
├── next.config.js                 ← Next.js config
├── jsconfig.json                  ← Path aliases (@/lib, @/app)
├── .env.local                     ← Environment variables (gitignored)
└── .env.local.example             ← Template for env vars
```

---

## 13. Environment Configuration

### 13.1 Required Environment Variables

```env
# Groq API (LLM inference)
GROQ_API_KEY=gsk_...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase Database & Storage
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 13.2 Setup Steps
1. Create a Groq account at `console.groq.com` and generate an API key
2. Create a Clerk application and copy publishable + secret keys
3. Create a Supabase project, run `supabase-setup.sql` in the SQL editor
4. Run `planning-setup.sql` for the planning module schema
5. Create a Supabase Storage bucket named `cleaned-files`
6. Copy all keys to `.env.local`
7. Run `npm install && npm run dev`

---

## 14. Feature Specifications

### 14.1 Data Ingestion
- **Supported formats:** CSV, Excel (`.xlsx`, `.xls`), JSON
- **Parsing library:** PapaParse (`skipEmptyLines: true`)
- **Upload method:** Drag-and-drop or file picker click
- **Sample datasets:** Customer Master, Product Data, Address List (hardcoded, deliberately dirty)
- **State reset:** Loading new data resets all downstream state (cleanse results, audit, dedup, chat)

### 14.2 Data Profiling
- **Trigger:** Clicking "Profile Data" button or navigating to Profile tab
- **Computation:** Client-side, synchronous
- **Output:** Per-column cards showing fill rate, empty count, unique count, detected issues
- **Color coding:** Green >90%, Yellow >60%, Red ≤60% fill rate

### 14.3 Rules Engine
- **Storage:** Supabase `rules` table (persisted per user)
- **Actions:** 13 built-in actions + custom JS expression
- **Inline editing:** Field, type, action editable inline with `onBlur` PATCH call
- **AI advisor:** Conversational Groq chat that proposes rules as JSON, user confirms before saving
- **Toggle:** Individual rules can be enabled/disabled without deletion

### 14.4 AI Cleanse Agent
- **Interface:** Chat UI with message history
- **Max iterations:** 8 tool-call cycles per request
- **Tools available:** 9 tools (summarize, inspect, trim, set_case, standardize, apply_rule, run_transform, remove_duplicates, remove_missing)
- **Dataset preview:** Live table updates after each agent response
- **Works without data:** Can answer general SAP/ERP knowledge questions even with no file loaded

### 14.5 Audit Log
- **Populated by:** Rule-based cleanse only (not AI agent)
- **Fields:** Timestamp, Record #, Field, Before, After, Rule, Confidence
- **Export:** CSV download available
- **Types:** `CHANGE` (value modified) and `ISSUE` (validation flag)

### 14.6 Duplicate Detection
#### Exact Mode
- Select columns (or use all if none checked)
- Preview highlights duplicate rows (red background)
- Remove deduplicates — keeps first occurrence, removes subsequent ones
- Displays summary of removed/remaining count

#### Fuzzy Mode
- Configurable similarity threshold (50–99%)
- Three algorithms: Combined (default), Levenshtein-only, Token-only
- Returns duplicate pairs with per-column similarity scores
- Read-only — does not automatically remove rows

### 14.7 Job History
- Lists last 20 saved jobs per user
- Each job shows: filename, row count, status, creation date
- Download button with 1-hour signed Supabase Storage URL

### 14.8 Groq Setup Tab
- Real-time Groq API health check (pings `/models` endpoint)
- Model selection from 5 curated models
- Domain context textarea — injected into every agent system prompt
- Model comparison table with context window, speed, and best-use info

### 14.9 Guides Tab
- 8 interactive tutorial cards covering each pipeline stage
- 👍/👎 voting stored in `localStorage`
- Cards link directly to their relevant tab via the ▶ button

---

## 15. Non-Functional Requirements

### 15.1 Performance
| Scenario | Expected Behaviour |
|---|---|
| Client-side profiling | Synchronous, immediate (<100ms for typical datasets) |
| Rule-based cleanse | Async with 600ms artificial delay for UX feedback |
| Fuzzy dedup | 300ms delay; O(n²) — warn users for large datasets (>1000 rows) |
| Groq API response | 1–5 seconds per agent iteration (Groq's ultra-fast inference) |

### 15.2 Scalability Considerations
- Client-side algorithms (dedup, profiling, rule-cleanse) run in the browser — performance degrades with large datasets
- AI agent processes full dataset as JSON in request body — large datasets may hit token limits
- Supabase Storage used for file export — no size limit enforced in current implementation

### 15.3 Browser Compatibility
- Requires modern browser with support for:
  - ES2020+ (optional chaining, nullish coalescing)
  - `new Function()` (used in custom rule expressions)
  - `URL.createObjectURL()` (CSV download)
  - CSS Grid and CSS Custom Properties

### 15.4 Accessibility
- Keyboard navigation supported (Enter key submits chat inputs)
- Semantic HTML structure
- Color alone is not the only status indicator (text labels accompany color tags)

---

## 16. Limitations & Known Constraints

| Limitation | Description |
|---|---|
| **No RLS in Supabase** | Access control enforced entirely in application code. Future direct client-side access would require proper Postgres policies. |
| **Single-file dataset** | Only one dataset can be loaded at a time; loading a new file discards the previous state. |
| **Agent token limits** | Large datasets sent to Groq may approach model context window limits (128k for most models). |
| **Fuzzy dedup is O(n²)** | Pairwise comparison becomes slow for datasets >500 rows. |
| **Audit trail is local only** | The audit log is generated by the rule-based engine only, not the AI agent. Agent changes visible in Live Data Preview only. |
| **Memory system is partial** | `applyMemoryToAnalysis` is implemented but not currently wired into the chat agent flow. |
| **No real-time collaboration** | Single-user session — no multi-user or shared-session support. |
| **No undo functionality** | Once the agent modifies data, there is no built-in undo (user can reset chat to restore original `rawData`). |
| **Excel parsing** | PapaParse handles CSV natively; Excel support may require additional configuration or `xlsx` library. |

---

*End of Technical Specification Document*

---
**Document Version Control**

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | June 2025 | Priyanka Navnath More | Initial release |
