import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();

// ── Professional Light Theme ──────────────────────────────────────────────────
const T = {
  white:   'FFFFFF',
  bg:      'F4F6FA',       // slide background — soft blue-gray
  card:    'FFFFFF',       // card/box fill
  navy:    '1B2E5E',       // primary dark — headers, accent bar
  blue:    '2A6DD9',       // primary blue — links, highlights
  teal:    '0A7EA4',       // secondary accent
  indigo:  '4F46E5',       // tertiary accent
  green:   '16A34A',       // success / check
  amber:   'B45309',       // warning
  red:     'DC2626',       // error / cross
  txt:     '1E293B',       // body text (dark slate)
  muted:   '64748B',       // secondary text
  border:  'CBD5E1',       // light border
  divider: 'E2E8F0',       // very subtle divider
  rowAlt:  'F0F4FF',       // alternating table row
  accent:  'EEF2FF',       // light indigo tint for boxes
};

pptx.layout  = 'LAYOUT_WIDE';
pptx.author  = 'DataCleanse AI';
pptx.title   = 'DataCleanse AI — Technical Presentation';

// ── Helpers ───────────────────────────────────────────────────────────────────
function addBg(slide) {
  slide.background = { color: T.bg };
  // top navy bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.12, fill: { color: T.navy } });
  // bottom thin line
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.38, w: '100%', h: 0.12, fill: { color: T.navy } });
}

function addSlideLabel(slide, label, y = 0.22) {
  slide.addText(label, {
    x: 0.45, y, w: 11, h: 0.22,
    fontSize: 7.5, color: T.muted, fontFace: 'Calibri',
    charSpacing: 2.5, valign: 'top',
  });
}

function addSlideNumber(slide, num) {
  slide.addText(`${num} / 14`, {
    x: 12.2, y: 0.22, w: 1, h: 0.22,
    fontSize: 7.5, color: T.muted, fontFace: 'Calibri',
    align: 'right', valign: 'top',
  });
}

function addHeading(slide, text, y = 0.52) {
  slide.addText(text, {
    x: 0.45, y, w: 12.4, h: 0.58,
    fontSize: 24, bold: true, color: T.navy,
    fontFace: 'Calibri', valign: 'top',
  });
  // underline rule
  slide.addShape(pptx.ShapeType.rect, { x: 0.45, y: y + 0.6, w: 1.4, h: 0.05, fill: { color: T.blue } });
}

function addSubheading(slide, text, y, color) {
  slide.addText(text, {
    x: 0.45, y, w: 12.4, h: 0.3,
    fontSize: 11.5, bold: true, color: color || T.navy,
    fontFace: 'Calibri', valign: 'top',
  });
}

function card(slide, x, y, w, h, title, body, iconText) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: T.card },
    line: { color: T.border, width: 0.75 },
    shadow: { type: 'outer', blur: 4, offset: 2, angle: 45, color: 'CBD5E1', opacity: 0.5 },
  });
  // left accent strip
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: T.blue } });
  if (iconText) {
    slide.addText(iconText, { x: x + 0.15, y: y + 0.1, w: 0.4, h: 0.35, fontSize: 14, valign: 'top' });
  }
  slide.addText(title, {
    x: x + (iconText ? 0.58 : 0.18), y: y + 0.1,
    w: w - (iconText ? 0.72 : 0.3), h: 0.28,
    fontSize: 10, bold: true, color: T.navy, fontFace: 'Calibri', valign: 'top',
  });
  slide.addText(body, {
    x: x + 0.18, y: y + 0.42,
    w: w - 0.3, h: h - 0.55,
    fontSize: 8.5, color: T.muted, fontFace: 'Calibri', valign: 'top', wrap: true,
  });
}

function statBox(slide, x, y, num, label, accent) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 2.32, h: 1.15,
    fill: { color: T.card },
    line: { color: T.border, width: 0.75 },
    shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, color: 'CBD5E1', opacity: 0.4 },
  });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 2.32, h: 0.06, fill: { color: accent || T.blue } });
  slide.addText(num, {
    x, y: y + 0.18, w: 2.32, h: 0.56,
    fontSize: 26, bold: true, color: accent || T.blue, fontFace: 'Calibri', align: 'center', valign: 'top',
  });
  slide.addText(label, {
    x, y: y + 0.76, w: 2.32, h: 0.3,
    fontSize: 7, color: T.muted, fontFace: 'Calibri', align: 'center', valign: 'top', charSpacing: 0.5,
  });
}

function addTable(slide, headers, rows, x, y, colWidths) {
  const headerRow = headers.map(h => ({
    text: h,
    options: {
      bold: true, color: T.white, fill: { color: T.navy },
      fontSize: 8.5, fontFace: 'Calibri',
      border: [{ color: T.navy, pt: 0.5 }],
      align: 'left', valign: 'middle',
    },
  }));
  const dataRows = rows.map((row, ri) =>
    row.map(cell => ({
      text: cell,
      options: {
        color: T.txt, fill: { color: ri % 2 === 0 ? T.card : T.rowAlt },
        fontSize: 8.5, fontFace: 'Calibri',
        border: [{ color: T.divider, pt: 0.5 }],
        align: 'left', valign: 'middle',
      },
    }))
  );
  slide.addTable([headerRow, ...dataRows], {
    x, y, w: colWidths.reduce((a, b) => a + b, 0),
    colW: colWidths, rowH: 0.3,
    border: { color: T.border, pt: 0.5 },
  });
}

function flowBox(slide, x, y, w, text, active) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.38,
    fill: { color: active ? 'EEF4FF' : T.card },
    line: { color: active ? T.blue : T.border, width: active ? 1.5 : 0.75 },
  });
  slide.addText(text, {
    x: x + 0.12, y, w: w - 0.24, h: 0.38,
    fontSize: 8.5, color: active ? T.blue : T.txt, fontFace: 'Calibri', valign: 'middle', wrap: true, bold: active,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: T.white };

  // Full-width navy header band
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 2.5, fill: { color: T.navy } });
  // Blue accent stripe
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 2.5, w: '100%', h: 0.12, fill: { color: T.blue } });

  // Title in header
  s.addText('DataCleanse AI', {
    x: 0.6, y: 0.42, w: 12.1, h: 1.1,
    fontSize: 50, bold: true, color: T.white, fontFace: 'Calibri', align: 'center',
  });
  s.addText('AI-Powered Data Cleansing Platform', {
    x: 0.6, y: 1.6, w: 12.1, h: 0.55,
    fontSize: 16, color: 'A5C8F0', fontFace: 'Calibri', align: 'center',
  });

  // Subtitle
  s.addText(
    'A scalable, cloud-native platform that detects, recommends, and auto-corrects data quality issues\nusing Next.js 14, Groq (LLaMA 3.3-70B), Supabase, and Clerk — deployed on Vercel.',
    { x: 1.2, y: 2.85, w: 10.9, h: 0.85, fontSize: 12, color: T.muted, fontFace: 'Calibri', align: 'center', wrap: true }
  );

  // Divider
  s.addShape(pptx.ShapeType.line, { x: 1.5, y: 3.9, w: 10.3, h: 0, line: { color: T.divider, width: 1 } });

  // Meta boxes
  const metas = [
    ['Stack', 'Next.js 14 · Groq · Supabase · Clerk', T.blue],
    ['Deployment', 'Vercel — Serverless / Edge', T.teal],
    ['AI Model', 'LLaMA 3.3-70B-Versatile', T.indigo],
    ['Date', 'July 2026', T.navy],
  ];
  metas.forEach(([lbl, val, color], i) => {
    const x = 0.55 + i * 3.15;
    s.addShape(pptx.ShapeType.rect, { x, y: 4.1, w: 3.0, h: 1.0, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
    s.addShape(pptx.ShapeType.rect, { x, y: 4.1, w: 3.0, h: 0.07, fill: { color } });
    s.addText(lbl, { x, y: 4.22, w: 3.0, h: 0.24, fontSize: 8, color: T.muted, fontFace: 'Calibri', align: 'center', charSpacing: 1 });
    s.addText(val, { x, y: 4.48, w: 3.0, h: 0.42, fontSize: 10, bold: true, color: T.navy, fontFace: 'Calibri', align: 'center', wrap: true });
  });

  // Bottom bar
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.26, w: '100%', h: 0.24, fill: { color: T.navy } });
  s.addText('TECHNICAL PRESENTATION  ·  CONFIDENTIAL', {
    x: 0, y: 7.27, w: '100%', h: 0.22,
    fontSize: 7, color: 'A0AEC0', fontFace: 'Calibri', align: 'center', charSpacing: 2,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Executive Summary
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '01  ·  EXECUTIVE SUMMARY');
  addSlideNumber(s, 2);
  addHeading(s, 'Executive Summary');

  // Mission statement highlight box
  s.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 1.3, w: 12.4, h: 1.5,
    fill: { color: 'EEF4FF' },
    line: { color: T.blue, width: 1.5 },
  });
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 1.3, w: 0.1, h: 1.5, fill: { color: T.blue } });
  s.addText('Mission Statement', {
    x: 0.68, y: 1.36, w: 12.1, h: 0.26,
    fontSize: 8.5, bold: true, color: T.blue, fontFace: 'Calibri', charSpacing: 1,
  });
  s.addText(
    'The AI Data Cleansing Tool mission delivers a scalable, reusable capability to detect, recommend, and auto-correct data quality issues. It improves reliability of analytics and AI, reduces manual work, and provides measurable outcomes through quality KPIs, adoption metrics, and operational incident reduction.',
    { x: 0.68, y: 1.65, w: 12.1, h: 1.0, fontSize: 12, color: T.txt, fontFace: 'Calibri', valign: 'top', wrap: true }
  );

  // 5 KPI stat boxes
  const stats = [
    ['9',     'AI TOOLS',         T.blue],
    ['8',     'AGENT STEPS',      T.teal],
    ['< 2s',  'GROQ LATENCY',     T.indigo],
    ['100%',  'SERVERLESS',       T.navy],
    ['0',     'GPU NEEDED',       T.amber],
  ];
  stats.forEach(([num, lbl, color], i) => statBox(s, 0.45 + i * 2.52, 3.05, num, lbl, color));

  // Three pillars
  const pillars = [
    ['🔍', 'Detect', 'Profiling engine scores data quality per column — surfacing nulls, type mismatches, and outliers with a composite DQ score.'],
    ['💡', 'Recommend', 'AI agent inspects real column samples and suggests the correct cleaning action — trim, normalize, standardize — per column.'],
    ['⚡', 'Auto-Correct', 'Agent executes transformations in a live loop and returns the cleaned dataset in seconds. No code, no scripts required.'],
  ];
  pillars.forEach(([icon, title, body], i) => card(s, 0.45 + i * 4.25, 4.38, 4.05, 2.7, title, body, icon));
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — System Architecture
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '02  ·  ARCHITECTURE');
  addSlideNumber(s, 3);
  addHeading(s, 'System Architecture');

  const layers = [
    { label: 'Browser (React)', sub: 'CSV upload · 8-tab UI\nlive preview · export', color: T.blue,   x: 0.4 },
    { label: 'Next.js API Routes', sub: 'Server-only — API keys\nnever reach browser', color: T.teal,  x: 3.55 },
    { label: 'Groq API (LLaMA 70B)', sub: 'Tool-use loop · JSON\n< 2s avg latency',   color: T.indigo, x: 6.7 },
    { label: 'Supabase PostgreSQL', sub: 'Rules persistence\nrow-level isolation',    color: T.navy,   x: 9.85 },
  ];
  layers.forEach(({ label, sub, color, x }) => {
    s.addShape(pptx.ShapeType.rect, { x, y: 1.32, w: 3.0, h: 1.1, fill: { color: T.card }, line: { color, width: 1.5 } });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.32, w: 3.0, h: 0.08, fill: { color } });
    s.addText(label, { x: x + 0.12, y: 1.46, w: 2.76, h: 0.32, fontSize: 9.5, bold: true, color, fontFace: 'Calibri', valign: 'top' });
    s.addText(sub,   { x: x + 0.12, y: 1.78, w: 2.76, h: 0.5, fontSize: 8, color: T.muted, fontFace: 'Calibri', valign: 'top', wrap: true });
  });

  // Arrows
  [3.4, 6.55, 9.7].forEach(x => {
    s.addText('→', { x: x - 0.07, y: 1.72, w: 0.45, h: 0.3, fontSize: 14, color: T.blue, align: 'center', bold: true });
  });

  // Clerk
  s.addShape(pptx.ShapeType.rect, { x: 5.15, y: 2.7, w: 3.0, h: 0.78, fill: { color: T.card }, line: { color: T.border, width: 1 } });
  s.addShape(pptx.ShapeType.rect, { x: 5.15, y: 2.7, w: 3.0, h: 0.07, fill: { color: T.muted } });
  s.addText('Clerk Auth', { x: 5.27, y: 2.82, w: 2.76, h: 0.28, fontSize: 10, bold: true, color: T.navy, fontFace: 'Calibri' });
  s.addText('JWT validation · user_id scoping · sign-in/up UI', { x: 5.27, y: 3.08, w: 2.76, h: 0.28, fontSize: 8, color: T.muted, fontFace: 'Calibri' });

  addTable(s,
    ['Layer', 'Technology', 'Responsibility'],
    [
      ['Frontend',        'Next.js 14 App Router, React',   'CSV upload, live preview, 8 feature tabs'],
      ['Authentication',  'Clerk',                          'Sign-in/up, JWT validation, user identity'],
      ['AI Agent',        'Groq + LLaMA 3.3-70B',           'Tool-use loop, natural language → data ops'],
      ['Tool Executor',   'Custom JS (agentTools.js)',       'Runs inspect/transform tools in-memory'],
      ['Database',        'Supabase PostgreSQL',             'Persistent rules, row-level user isolation'],
      ['Hosting',         'Vercel',                          'Serverless functions, CDN, CI/CD from GitHub'],
    ],
    0.4, 3.65, [2.2, 3.2, 7.05]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Key Features
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '03  ·  KEY FEATURES');
  addSlideNumber(s, 4);
  addHeading(s, 'Key Features');

  const features = [
    ['🤖', 'AI Chat Agent', 'Describe tasks in plain English. Agent inspects data, calls the right tools, and cleans — no code required.'],
    ['📋', 'Rules Engine', 'Define named, reusable rules (trim, email, phone, custom JS). Stored in Supabase across all sessions.'],
    ['🔍', 'Data Profiling', 'Per-column null %, type inference, unique counts. Composite DQ score quantifies dataset health.'],
    ['🔁', 'Fuzzy Dedup', 'Levenshtein + token similarity finds near-duplicate rows. Threshold slider controls strictness.'],
    ['📊', 'Audit Trail', 'Every transformation timestamped and logged. Export clean CSV or full audit CSV separately.'],
    ['⚡', 'Multi-Model', 'Switch LLaMA 3.3-70B / Gemma / Mixtral from the UI. Live Groq API status indicator shown.'],
    ['🔐', 'Row-Level Isolation', 'Every rule scoped to authenticated user_id. No data leakage between accounts — ever.'],
    ['🌐', 'Fully Serverless', 'No server to manage. Vercel auto-deploys from GitHub. Scales to zero when idle.'],
    ['📥', 'Sample Datasets', 'Three built-in demos (Customer, Product, Address) to explore every feature without uploading data.'],
  ];

  features.forEach(([icon, title, body], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    card(s, 0.4 + col * 4.32, 1.18 + row * 2.0, 4.1, 1.87, title, body, icon);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — AI Agent Deep-dive
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '04  ·  AI AGENT');
  addSlideNumber(s, 5);
  addHeading(s, 'How the AI Agent Works');

  addSubheading(s, 'Multi-Step Agentic Loop  (up to 8 steps per user message)', 1.18, T.navy);

  const steps = [
    [true,  '1.  User sends message  →  "fix phone numbers in the dataset"'],
    [false, '2.  System prompt injected  →  user rules + domain context appended'],
    [true,  '3.  Groq returns tool_calls  →  [ inspect_column("Phone") ]'],
    [false, '4.  executeTool() runs  →  returns sample values + missing count'],
    [true,  '5.  Groq sees result  →  calls apply_rule("Phone", "normalize_phone")'],
    [false, '6.  executeTool() mutates rows in-memory  →  rows_changed count returned'],
    [true,  '7.  Groq returns final text reply  →  no more tool_calls'],
    [false, '8.  API responds  →  { reply, headers, rows, toolLog }'],
  ];

  steps.forEach(([active, text], i) => {
    flowBox(s, 0.4, 1.5 + i * 0.52, 6.5, text, active);
    if (i < steps.length - 1) {
      s.addText('↓', { x: 0.4, y: 1.85 + i * 0.52, w: 6.5, h: 0.18, fontSize: 9, color: T.muted, align: 'center' });
    }
  });

  addSubheading(s, 'Agent Tools  (9 available)', 1.18, T.teal);
  addTable(s,
    ['Tool', 'Purpose'],
    [
      ['summarize_data',           'Row/column counts and column names'],
      ['inspect_column',           'Sample values + missing count (always first)'],
      ['trim_whitespace',          'Strip leading/trailing spaces from every value'],
      ['set_case',                 'title / upper / lower case normalization'],
      ['standardize_values',       'Map inconsistent variants to canonical form'],
      ['apply_rule',               'Run a user-defined persistent Supabase rule'],
      ['run_transform',            'Execute arbitrary safe JS expression per row'],
      ['remove_duplicate_rows',    'Exact byte-for-byte deduplication'],
      ['remove_rows_with_missing', 'Delete rows where a column is empty'],
    ],
    7.1, 1.5, [3.4, 5.8]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Rules Engine
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '05  ·  RULES ENGINE');
  addSlideNumber(s, 6);
  addHeading(s, 'Dynamic Rules Engine');

  s.addText(
    'Rules are the institutional memory of the platform. Defined once, they persist across every session and are automatically injected into the AI\'s system prompt so the agent uses them intelligently.',
    { x: 0.45, y: 1.22, w: 12.4, h: 0.48, fontSize: 10.5, color: T.muted, fontFace: 'Calibri', wrap: true }
  );

  addSubheading(s, 'Supported Actions  (13 total)', 1.78, T.navy);

  const actionGroups = [
    { label: 'Text',     color: T.blue,   items: ['trim', 'title_case', 'upper_case', 'lower_case'] },
    { label: 'Contact',  color: T.teal,   items: ['validate_email', 'normalize_phone', 'std_country', 'title_case_city', 'std_state_code'] },
    { label: 'Numeric',  color: T.indigo, items: ['normalize_currency', 'normalize_decimal'] },
    { label: 'Other',    color: T.navy,   items: ['remove_special', 'custom (JS)'] },
  ];

  let col = 0;
  actionGroups.forEach(({ label, color, items }) => {
    const gx = 0.45 + col * 3.25;
    s.addShape(pptx.ShapeType.rect, { x: gx, y: 2.1, w: 3.1, h: 0.26, fill: { color }, line: { color, width: 0 } });
    s.addText(label, { x: gx + 0.1, y: 2.12, w: 3.0, h: 0.22, fontSize: 8, bold: true, color: T.white, fontFace: 'Calibri' });
    items.forEach((action, j) => {
      const y = 2.38 + j * 0.35;
      s.addShape(pptx.ShapeType.rect, { x: gx, y, w: 3.1, h: 0.3, fill: { color: j % 2 === 0 ? T.card : T.rowAlt }, line: { color: T.divider, width: 0.5 } });
      s.addText(action, { x: gx + 0.12, y, w: 2.9, h: 0.3, fontSize: 9, color: T.txt, fontFace: 'Calibri', valign: 'middle' });
    });
    col++;
  });

  addSubheading(s, 'Rule Schema  (Supabase)', 4.0, T.navy);
  addTable(s,
    ['Field', 'Type', 'Description'],
    [
      ['id',          'uuid',       'Auto-generated primary key'],
      ['user_id',     'text',       'Clerk userId — row-level isolation'],
      ['field',       'text',       'CSV column name this rule targets'],
      ['action',      'text',       'Transformation action (see above)'],
      ['expression',  'text?',      'JS expression for custom action type'],
      ['active',      'boolean',    'Toggle on/off without deleting'],
    ],
    0.45, 4.32, [2.0, 1.55, 8.9]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Usage Guide
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '06  ·  USAGE GUIDE');
  addSlideNumber(s, 7);
  addHeading(s, 'Usage Guide — Tab by Tab');

  const tabs = [
    ['1 · Upload',    'Drag-drop a CSV or pick a built-in sample (Customer, Product, Address). PapaParse runs in-browser — data never hits the server until you trigger an AI operation.'],
    ['2 · Rules',     'Add cleaning rules manually (column → action → optional JS expression) or click AI Rules and describe your data in plain English. Rules auto-save to Supabase.'],
    ['3 · Cleanse',   'Click Run Cleanse to apply all active rules in a single batch pass. Audit log on the right records every transformation with before/after counts.'],
    ['4 · AI Chat',   '"Standardize all country names"\n"Remove rows where Email is blank"\n"Fix phone numbers — strip country codes"\n"Convert Revenue — remove $ signs"'],
    ['5 · Profile',   'Click Profile Data → per-column null %, unique values, inferred type, and a composite Data Quality (DQ) score displayed as a live gauge.'],
    ['6 · Dedup',     'Select key columns + similarity threshold (0–1) + algorithm (Levenshtein / Token similarity). Find Duplicates shows ranked candidate groups for review.'],
    ['7 · Export',    'Download clean CSV or audit trail CSV. Generated client-side via Papa.unparse — no server round-trip needed for export.'],
    ['8 · Settings',  'Set AI model, configure domain context (custom instructions injected into every AI prompt), check live Groq API status.'],
  ];

  tabs.forEach(([title, body], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(s, 0.4 + col * 6.58, 1.12 + row * 1.57, 6.3, 1.43, title, body);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Performance
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '07  ·  PERFORMANCE');
  addSlideNumber(s, 8);
  addHeading(s, 'Performance Characteristics');

  addSubheading(s, 'Groq Inference Latency', 1.2, T.navy);
  addTable(s,
    ['Operation', 'Typical Latency', 'Notes'],
    [
      ['Single tool call (inspect_column)',   '0.4 – 0.8 s',   'Groq LPU hardware, LLaMA 3.3-70B'],
      ['Full agent loop (3–5 steps)',         '1.5 – 4 s',     'Includes tool execution time'],
      ['AI Rules generation',                '0.8 – 1.5 s',   'Single-turn, structured JSON output'],
      ['Supabase rule fetch  GET /api/rules', '30 – 80 ms',    'Indexed by user_id'],
      ['Supabase rule insert / update',       '40 – 100 ms',   'Service role key, no RLS overhead'],
    ],
    0.45, 1.5, [4.6, 2.5, 5.35]
  );

  addSubheading(s, 'Client-Side Processing  (Browser, no server)', 3.35, T.navy);
  addTable(s,
    ['Operation', 'Scale', 'Time'],
    [
      ['CSV parsing  (PapaParse)',    '10,000 rows',           '< 100 ms'],
      ['CSV parsing  (PapaParse)',    '100,000 rows',          '~ 500 ms'],
      ['Batch cleanse (rules engine)','10,000 rows × 10 rules','< 200 ms'],
      ['Fuzzy dedup  (Levenshtein)',  '1,000 rows × 2 cols',   '< 1 s'],
      ['Data profiling',             '10,000 rows × 20 cols',  '< 300 ms'],
    ],
    0.45, 3.65, [4.6, 3.3, 4.55]
  );

  addSubheading(s, 'Scalability Guidance', 5.55, T.navy);
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 5.82, w: 12.4, h: 1.28, fill: { color: 'FFF8E7' }, line: { color: T.amber, width: 1 } });
  s.addText(
    'AI Agent: best performance up to ~10,000 rows (full dataset serialized to JSON per message). ' +
    'Batch Cleanse (Tab 3): no AI involved — scales to 100K+ rows in the browser without issue. ' +
    'Future path: upload CSV to Supabase Storage → agent reads paginated chunks → removes the 10K row ceiling.',
    { x: 0.65, y: 5.92, w: 12.0, h: 1.08, fontSize: 9.5, color: T.txt, fontFace: 'Calibri', valign: 'top', wrap: true }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Security Model
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '08  ·  SECURITY');
  addSlideNumber(s, 9);
  addHeading(s, 'Security Model');

  const items = [
    ['🔑', 'API Keys — Server Only',   'GROQ_API_KEY and SUPABASE_SERVICE_ROLE_KEY live in server environment variables. They are never exposed to the browser client.'],
    ['🧑‍💻', 'Clerk Authentication',    'Every API route calls auth() server-side. Unauthenticated requests receive HTTP 401 before any data is accessed.'],
    ['🔒', 'Row-Level Isolation',      'All Supabase queries include .eq("user_id", userId). One user cannot read or mutate another user\'s rules — enforced at the API layer.'],
    ['🛡️', 'JS Sandbox',              'AI-generated run_transform expressions are blocked from require, fetch, process, eval, and other dangerous globals before execution.'],
    ['🚫', 'Field Whitelist  (PATCH)', 'Rule update endpoint only allows: field, type, action, expression, description, active. Mass-assignment attacks are structurally impossible.'],
    ['📡', 'No Data Persistence',      'Uploaded CSV data is never written to any database. It exists only in browser memory and the HTTP request body during AI agent calls.'],
  ];

  items.forEach(([icon, title, body], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    card(s, 0.4 + col * 4.32, 1.18 + row * 2.55, 4.1, 2.38, title, body, icon);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Tech Stack
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '09  ·  TECHNOLOGY STACK');
  addSlideNumber(s, 10);
  addHeading(s, 'Full Technology Stack');

  addTable(s,
    ['Category', 'Technology', 'Version / Plan', 'Role'],
    [
      ['Framework',       'Next.js',                    '14 (App Router)',      'Full-stack React framework'],
      ['Language',        'JavaScript (ES2022)',         '—',                   'All application code — no TypeScript'],
      ['AI Provider',     'Groq Cloud',                  'Free tier',           'LLM inference with function / tool-use'],
      ['LLM',             'LLaMA 3.3-70B-Versatile',    'Meta / Groq-hosted',  'Agent reasoning + structured JSON output'],
      ['Auth',            'Clerk',                       'Free tier',           'Sign-in/up, JWT, user identity management'],
      ['Database',        'Supabase PostgreSQL',         'Free tier',           'Persistent rules storage, per-user isolation'],
      ['CSV Parsing',     'PapaParse',                   '5.x',                 'Browser-side CSV parse and unparse'],
      ['Deployment',      'Vercel',                      'Hobby (free)',         'Serverless functions, global CDN, CI/CD'],
      ['Fonts',           'IBM Plex Mono + Syne',        'Google Fonts',        'UI typography'],
      ['Styling',         'Plain CSS (custom properties)','—',                  'Dark neon design system (all hand-written)'],
      ['Source Control',  'GitHub',                      'Public repository',   'Version control + Vercel auto-deploy trigger'],
    ],
    0.45, 1.15, [2.2, 3.1, 2.3, 4.85]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Deployment
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '10  ·  DEPLOYMENT & CI/CD');
  addSlideNumber(s, 11);
  addHeading(s, 'Deployment & CI/CD');

  addSubheading(s, 'Environment Variables  (set in Vercel project settings)', 1.22, T.navy);
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 1.5, w: 6.0, h: 1.55, fill: { color: 'F0F4FF' }, line: { color: T.border, width: 0.75 } });
  s.addText(
    'GROQ_API_KEY = gsk_...\nNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_...\nCLERK_SECRET_KEY = sk_live_...\nNEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co\nSUPABASE_SERVICE_ROLE_KEY = eyJ...',
    { x: 0.65, y: 1.58, w: 5.7, h: 1.4, fontSize: 9, color: T.navy, fontFace: 'Courier New', valign: 'top', wrap: true }
  );

  addSubheading(s, 'Supabase Schema  (run once in SQL editor)', 3.22, T.navy);
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 3.5, w: 6.0, h: 3.08, fill: { color: 'F0F4FF' }, line: { color: T.border, width: 0.75 } });
  s.addText(
    'create table rules (\n  id          uuid primary key default gen_random_uuid(),\n  user_id     text not null,\n  field       text not null,\n  type        text not null,\n  action      text not null default \'custom\',\n  expression  text,\n  description text,\n  active      boolean not null default true,\n  created_at  timestamptz not null default now()\n);\ncreate index rules_user_id_idx\n  on rules (user_id, created_at);',
    { x: 0.65, y: 3.58, w: 5.7, h: 2.92, fontSize: 8.5, color: T.navy, fontFace: 'Courier New', valign: 'top', wrap: true }
  );

  addSubheading(s, 'Deploy Checklist', 1.22, T.teal);
  const steps = [
    ['Push to GitHub', 'git push origin main — Vercel detects and starts build automatically.'],
    ['Set Env Vars in Vercel', 'Project → Settings → Environment Variables — add all 5 keys listed.'],
    ['Configure Clerk Domain', 'Dashboard → Domains → add bare Vercel URL (no https:// prefix).'],
    ['Run SQL in Supabase', 'Execute supabase-setup.sql in the SQL Editor to create the rules table.'],
  ];
  steps.forEach(([title, body], i) => {
    const y = 1.52 + i * 1.3;
    s.addShape(pptx.ShapeType.ellipse, { x: 6.75, y: y + 0.12, w: 0.38, h: 0.38, fill: { color: T.blue } });
    s.addText(String(i + 1), { x: 6.75, y: y + 0.12, w: 0.38, h: 0.38, fontSize: 10, bold: true, color: T.white, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    s.addText(title, { x: 7.28, y: y + 0.1, w: 5.9, h: 0.28, fontSize: 10, bold: true, color: T.navy, fontFace: 'Calibri' });
    s.addText(body,  { x: 7.28, y: y + 0.38, w: 5.9, h: 0.42, fontSize: 9, color: T.muted, fontFace: 'Calibri', wrap: true });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Competitive Comparison
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '11  ·  COMPETITIVE POSITIONING');
  addSlideNumber(s, 12);
  addHeading(s, 'Why DataCleanse AI vs. Alternatives');

  const compRows = [
    ['Natural language cleaning',  '✓  Yes',        '✗  No',       '✗  No',       '✗  No'],
    ['Persistent reusable rules',  '✓  Yes',        '✗  No',       '~  Limited',  '✓  Yes'],
    ['Zero install / cloud',       '✓  Yes',        '~  Partial',  '✗  No',       '~  Varies'],
    ['Fuzzy deduplication',        '✓  Yes',        '✗  No',       '✓  Yes',      '✓  Yes'],
    ['Data quality scoring',       '✓  Yes',        '✗  No',       '✗  No',       '✓  Yes'],
    ['Cost',                       '✓  Free (OSS)', '$ Subscription','✓  Free',   '$$$ License'],
    ['Setup time',                 '✓  < 10 min',   '✓  Instant',  '~  30 min',   '✗  Days/weeks'],
    ['Technical skill required',   '✓  None',       '~  Medium',   '~  Medium',   '✗  High'],
  ];

  const headers  = ['Feature', 'DataCleanse AI', 'Excel / Sheets', 'OpenRefine', 'Enterprise ETL'];
  const colW     = [3.8, 2.3, 2.3, 2.3, 2.25];
  const rowH     = 0.37;
  const colColors = [T.navy, T.blue, T.muted, T.muted, T.muted];

  // Header row
  headers.forEach((h, ci) => {
    const x = 0.45 + colW.slice(0, ci).reduce((a, b) => a + b, 0);
    s.addShape(pptx.ShapeType.rect, { x, y: 1.15, w: colW[ci], h: rowH, fill: { color: ci === 1 ? T.blue : T.navy }, line: { color: T.white, width: 0.5 } });
    s.addText(h, { x: x + 0.1, y: 1.15, w: colW[ci] - 0.2, h: rowH, fontSize: 9, bold: true, color: T.white, fontFace: 'Calibri', valign: 'middle' });
  });

  compRows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = 0.45 + colW.slice(0, ci).reduce((a, b) => a + b, 0);
      const y = 1.15 + (ri + 1) * rowH;
      const isOurs = ci === 1;
      const isCheck = cell.startsWith('✓');
      const isCross = cell.startsWith('✗');
      const bgColor = isOurs ? 'EEF4FF' : ri % 2 === 0 ? T.card : T.rowAlt;
      const txtColor = isOurs
        ? (isCheck ? T.blue : isCross ? T.red : T.amber)
        : isCheck ? T.green : isCross ? T.red : T.amber;

      s.addShape(pptx.ShapeType.rect, { x, y, w: colW[ci], h: rowH, fill: { color: bgColor }, line: { color: T.divider, width: 0.5 } });
      if (isOurs) s.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h: rowH, fill: { color: T.blue } });
      s.addText(cell, { x: x + (isOurs ? 0.12 : 0.1), y, w: colW[ci] - 0.2, h: rowH, fontSize: 9, bold: isOurs && isCheck, color: txtColor, fontFace: 'Calibri', valign: 'middle' });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Limitations & Roadmap
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  addSlideLabel(s, '12  ·  ROADMAP');
  addSlideNumber(s, 13);
  addHeading(s, 'Limitations & Future Roadmap');

  addSubheading(s, 'Current Limitations', 1.2, T.navy);
  addTable(s,
    ['Limitation', 'Impact', 'Workaround / Note'],
    [
      ['AI agent row cap  (~10K rows)', 'Slow / fails on very large files',    'Use Batch Cleanse (Tab 3) for large files'],
      ['Groq free tier rate limits',   '429 errors under heavy concurrent load','Upgrade Groq plan or add retry/backoff logic'],
      ['No server-side data storage',  'Data lost on page refresh',            'Re-upload CSV; all rules are persistent in DB'],
      ['Single file at a time',        'No bulk / batch file processing',      'Re-upload manually for each file'],
      ['CSV only  (no .xlsx)',         'Must convert Excel files first',        'Use Excel "Save As CSV" before uploading'],
    ],
    0.45, 1.5, [3.4, 3.0, 5.55]
  );

  addSubheading(s, 'Roadmap — Future Enhancements', 4.05, T.teal);

  const roadmap = [
    ['☁️', 'Server-side Storage',  'Upload CSVs to Supabase Storage. Agent reads paginated chunks — removes 10K row ceiling entirely.'],
    ['📊', 'Excel / XLSX Support', 'Add SheetJS (xlsx library) to parse .xls/.xlsx directly in browser — no conversion step needed.'],
    ['🔄', 'Rule Templates',       'Pre-built rule sets for common schemas (CRM, e-commerce, HR) shareable across team accounts.'],
    ['📈', 'Job History',          'Save every cleansing run to Supabase so teams can audit changes over time and replay past runs.'],
  ];
  roadmap.forEach(([icon, title, body], i) => card(s, 0.45 + i * 3.25, 4.35, 3.08, 2.82, title, body, icon));
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — Thank You
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: T.white };

  // Full navy top band
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 2.2, fill: { color: T.navy } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 2.2, w: '100%', h: 0.1, fill: { color: T.blue } });

  s.addText('DataCleanse AI', { x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 46, bold: true, color: T.white, fontFace: 'Calibri', align: 'center' });
  s.addText('Detect  ·  Recommend  ·  Auto-Correct', { x: 0.6, y: 1.38, w: 12.1, h: 0.48, fontSize: 15, color: 'A5C8F0', fontFace: 'Calibri', align: 'center' });

  s.addText(
    'A scalable, serverless AI platform that removes the manual burden of data preparation\nand delivers measurable outcomes through quality KPIs, adoption metrics, and incident reduction.',
    { x: 1.5, y: 2.5, w: 10.3, h: 0.85, fontSize: 11.5, color: T.muted, fontFace: 'Calibri', align: 'center', wrap: true }
  );

  // Three takeaway pills
  const pills = [
    ['Zero Infrastructure', 'No GPU · no server · entirely managed cloud'],
    ['Institutional Memory', 'Rules persist per user across every session'],
    ['Measurable Outcomes', 'Quality KPIs · adoption metrics · incident reduction'],
  ];
  pills.forEach(([title, body], i) => {
    const x = 0.5 + i * 4.3;
    s.addShape(pptx.ShapeType.rect, { x, y: 3.55, w: 4.05, h: 1.35, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
    s.addShape(pptx.ShapeType.rect, { x, y: 3.55, w: 4.05, h: 0.08, fill: { color: T.blue } });
    s.addText(title, { x: x + 0.15, y: 3.7, w: 3.75, h: 0.3, fontSize: 10, bold: true, color: T.navy, fontFace: 'Calibri' });
    s.addText(body, { x: x + 0.15, y: 4.02, w: 3.75, h: 0.72, fontSize: 9, color: T.muted, fontFace: 'Calibri', wrap: true });
  });

  // Credits box
  s.addShape(pptx.ShapeType.rect, { x: 4.3, y: 5.2, w: 4.73, h: 1.72, fill: { color: T.bg }, line: { color: T.border, width: 0.75 } });
  s.addText('PREPARED BY',           { x: 4.3, y: 5.32, w: 4.73, h: 0.24, fontSize: 7.5, color: T.muted, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addText('Priyanka Navnath More', { x: 4.3, y: 5.56, w: 4.73, h: 0.36, fontSize: 13, bold: true, color: T.navy, fontFace: 'Calibri', align: 'center' });
  s.addText('July 2026  ·  v1.0',   { x: 4.3, y: 5.94, w: 4.73, h: 0.28, fontSize: 9, color: T.muted, fontFace: 'Calibri', align: 'center' });
  s.addText('github.com/priymore04-lab/AI_DATA_CLEANSING_TOOL', { x: 4.3, y: 6.26, w: 4.73, h: 0.26, fontSize: 8, color: T.blue, fontFace: 'Calibri', align: 'center' });

  // Bottom navy bar
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.26, w: '100%', h: 0.24, fill: { color: T.navy } });
  s.addText('DataCleanse AI  ·  Technical Presentation  ·  July 2026', {
    x: 0, y: 7.27, w: '100%', h: 0.22,
    fontSize: 7, color: 'A0AEC0', fontFace: 'Calibri', align: 'center', charSpacing: 1.5,
  });
}

// ── Write ─────────────────────────────────────────────────────────────────────
await pptx.writeFile({ fileName: 'public/DataCleanse-AI-Presentation.pptx' });
console.log('✅  Created: public/DataCleanse-AI-Presentation.pptx  (professional light theme)');
