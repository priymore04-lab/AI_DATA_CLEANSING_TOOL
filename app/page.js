'use client';

import { useEffect, useRef, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Papa from 'papaparse';
import { applyAction, COUNTRY_MAP } from '@/lib/agentTools';

// ── Constants ────────────────────────────────────────────
const TABS = ['guides','ingest','profile','rules','cleanse','audit','dedup','db','setup'];
const TAB_LABELS = {
  guides:'📖 Guides', ingest:'📂 Ingest', profile:'🔍 Profile', rules:'⚙️ Rules',
  cleanse:'⚡ Cleanse', audit:'📋 Audit', dedup:'🔁 Fuzzy Dedup',
  db:'🗄️ Database', setup:'🤖 Groq Setup',
};
const NAV_LABELS = {
  guides:'📖 Guides', ingest:'📂 Ingest', profile:'🔍 Profile', rules:'⚙️ Rules',
  cleanse:'⚡ AI Cleanse', audit:'📋 Audit Log', dedup:'🔁 Fuzzy Dedup',
  db:'🗄️ Database', setup:'🤖 Groq Setup',
};

const GUIDES = [
  { id:'ingest', tab:'ingest', icon:'📂', title:'Loading Your Data', level:'Beginner', duration:'3 min',
    desc:'Drag and drop a CSV, Excel, or JSON file — or start instantly with a built-in Customer, Product, or Address sample dataset. Your raw data lands in a live preview table ready for profiling.' },
  { id:'profile', tab:'profile', icon:'🔍', title:'Profiling Data Quality', level:'Beginner', duration:'2 min',
    desc:'Run an automatic scan across every column to see fill rate, empty cells, uniqueness, and flagged issues like invalid emails or mixed casing before you clean anything.' },
  { id:'rules', tab:'rules', icon:'⚙️', title:'Building Cleansing Rules', level:'Intermediate', duration:'5 min',
    desc:'Create field-level rules — trim, case conversion, phone/email/country normalization, or custom JS expressions — manually or by asking Groq to generate a rule set from a plain-English request.' },
  { id:'cleanse', tab:'cleanse', icon:'⚡', title:'AI Cleanse Agent', level:'Intermediate', duration:'6 min',
    desc:'Chat with the Groq-powered agent to fix data in plain English — "title case the Name column", "remove duplicates" — then layer optional rule-based cleansing on top and export the result.' },
  { id:'audit', tab:'audit', icon:'📋', title:'Reading the Audit Trail', level:'Beginner', duration:'2 min',
    desc:'Every change and flagged issue is logged with a timestamp, field, before/after value, and confidence score so you can trace exactly what the pipeline changed and why.' },
  { id:'dedup', tab:'dedup', icon:'🔁', title:'Fuzzy Duplicate Detection', level:'Intermediate', duration:'4 min',
    desc:'Pick which columns to compare, choose Levenshtein, token, or combined similarity, and set a threshold to surface near-duplicate records that exact matching would miss.' },
  { id:'db', tab:'db', icon:'🗄️', title:'Job History', level:'Beginner', duration:'1 min',
    desc:'Every saved cleanse job is stored to your account with row counts and status, so you can revisit or re-download results from past runs.' },
  { id:'setup', tab:'setup', icon:'🤖', title:'Configuring Groq', level:'Beginner', duration:'3 min',
    desc:'Connect your free Groq API key, pick a model based on speed vs. context needs, and set domain context so the AI agent follows your field-specific rules automatically.' },
];

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (recommended — best quality)' },
  { id: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant (fastest, low latency)' },
  { id: 'llama3-70b-8192', label: 'llama3-70b-8192 (Meta — very accurate)' },
  { id: 'mixtral-8x7b-32768', label: 'mixtral-8x7b-32768 (large context window)' },
  { id: 'gemma2-9b-it', label: 'gemma2-9b-it (Google — efficient)' },
];

const SAMPLES = {
  customer:{
    headers:['ID','Name','Email','Phone','City','State','Country','DOB'],
    rows:[
      ['1','john doe','john.doe@gmail.com','9876543210','Mumbai','Maharashtra','India','1985-03-12'],
      ['2','JANE SMITH','jane.smith@@yahoo.com','(022) 4455-6677','delhi','DL','IN','12/05/1990'],
      ['3','Rajesh Kumar','rajeshkumar','9123456789','Pune','MH','india','1978-15-22'],
      ['4','','alice@corp.com','','Bangalore','KA','INDIA','1995-07-08'],
      ['5','Bob Wilson','bob.wilson@test','001-555-9999','mumbai','MH','United States','1982-11-30'],
      ['6','Priya Mehta','priya.mehta@gmail.com','8800112233','Hyderabad','TS','India',''],
      ['7','CARLOS GOMEZ','carlos@example.com','555 123 4567','chennai','TN','india','1975-04-19'],
    ],
  },
  product:{
    headers:['SKU','Product Name','Price','Category','Stock'],
    rows:[
      ['P001','Laptop Pro 15"','Rs.85000','Electronics','50'],
      ['p002','WIRELESS MOUSE','1299','electronics',''],
      ['P003','keyboard Mechanical','$2499','Electronics','-5'],
      ['P004','usb hub 7-port','850.00 Rs','Accessories','200'],
      ['P005','Monitor 27inch','','Electronics','30'],
      ['P006','Webcam HD','1799','accessories','75'],
    ],
  },
  address:{
    headers:['ID','Street','City','State','PIN','Country'],
    rows:[
      ['1','123, MG Road','mumbai','maharashtra','400001','india'],
      ['2','flat 4b koregaon park','Pune','MH','411001','IN'],
      ['3','A-202 Green Valley Apt.','Bangalore','karnataka','56001','India'],
      ['4','56 Park Street','Kolkata','west bengal','700016','INDIA'],
      ['5','','Delhi','DL','','India'],
      ['6','Plot 7 Sector 18','noida','UP','201301','india'],
    ],
  },
};

const DEFAULT_RULES = [];

const ACTIONS = ['trim','title_case','upper_case','lower_case','validate_email',
  'normalize_phone','std_country','title_case_city','std_state_code','fix_date',
  'normalize_currency','normalize_decimal','remove_special','custom'];

// applyAction and COUNTRY_MAP imported from @/lib/agentTools

function autoActions(col) {
  const c = col.toLowerCase();
  const a = ['trim'];
  if (/\bname\b|first.?name|last.?name/.test(c)) a.push('title_case');
  if (/email|mail/.test(c)) a.push('validate_email');
  if (/phone|mobile|tel/.test(c)) a.push('normalize_phone');
  if (/country/.test(c)) a.push('std_country');
  if (/\bcity\b/.test(c)) a.push('title_case_city');
  if (/\bstate\b|province/.test(c)) a.push('std_state_code');
  if (/price|cost|amount/.test(c)) a.push('normalize_currency');
  return a;
}

function cleanseRow(row, headers, rules) {
  const cleaned = [...row], changes = [], issues = [];
  headers.forEach((h, i) => {
    let cur = (row[i] || '').trim();
    const acts = [...new Set([...autoActions(h), ...rules.filter(r => r.active && r.field.toLowerCase() === h.toLowerCase()).map(r => r.action)])];
    acts.forEach(act => { const res = applyAction(act, cur); if (res !== cur) { changes.push({ field: h, from: cur, to: res, rule: act }); cur = res; } });
    cleaned[i] = cur;
    if (!cur) issues.push(`Empty ${h}`);
    else if (/email/i.test(h) && !cur.includes('@')) issues.push(`Invalid email: ${cur}`);
  });
  const conf = issues.length === 0 ? 0.97 : issues.length === 1 ? 0.78 : issues.length === 2 ? 0.58 : 0.38;
  return { original: row, cleaned, changes, issues, confidence: conf, status: conf > 0.9 ? 'ok' : conf > 0.65 ? 'fixed' : 'review' };
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function tokenSim(a, b) {
  const sa = new Set(a.toLowerCase().split(/\s+/)), sb = new Set(b.toLowerCase().split(/\s+/));
  const inter = [...sa].filter(x => sb.has(x)).length;
  return inter / Math.max(sa.size, sb.size, 1);
}

function stringSim(a, b, algo) {
  const sa = String(a).trim(), sb = String(b).trim();
  if (!sa || !sb) return 0;
  if (algo === 'token') return tokenSim(sa, sb);
  const lev = 1 - levenshtein(sa, sb) / Math.max(sa.length, sb.length, 1);
  if (algo === 'levenshtein') return lev;
  return (lev + tokenSim(sa, sb)) / 2;
}

function sessionId() {
  if (typeof window === 'undefined') return '——';
  if (!window.__sid) window.__sid = (Math.random() * 1e6 | 0).toString(36).toUpperCase();
  return window.__sid;
}

// ── Main component ────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState('ingest');
  const [rawData, setRawData] = useState(null); // {headers, rows}
  const [cleanedData, setCleanedData] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, issues: 0, fixed: 0, review: 0 });
  const [dqScore, setDqScore] = useState(null);
  const [currentModel, setCurrentModel] = useState('llama-3.3-70b-versatile');
  const [systemContext, setSystemContext] = useState('');
  const [groqStatus, setGroqStatus] = useState('checking'); // 'online'|'offline'|'no_key'|'checking'
  const [groqModels, setGroqModels] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [cleanseBusy, setCleanseBusy] = useState(false);
  const [cleanseMsg, setCleanseMsg] = useState('');
  const [pastJobs, setPastJobs] = useState([]);
  const [guideVotes, setGuideVotes] = useState({});

  // AI chat
  const [rulesMsgs, setRulesMsgs] = useState([{ cls: 'sys', text: 'Tell me what rules to create — e.g. "add rules for name, email and phone" — and I\'ll add them to the list above.' }]);
  const [rulesInput, setRulesInput] = useState('');
  const [cleanseMsgs, setCleanseMsgs] = useState([{ cls: 'sys', text: 'Hi, I\'m your AI data assistant 👋 Ask me anything — data standards, key fields for a system like SAP, or tell me what to clean, e.g. "standardize the country column" or "what are the key columns for a Material master in SAP?".' }]);
  const [cleanseInput, setCleanseInput] = useState('');
  const [agentHistory, setAgentHistory] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const cleanseMsgsRef = useRef(null);

  // Dedup
  const [dedupCols, setDedupCols] = useState([]);
  const [dedupThreshold, setDedupThreshold] = useState(80);
  const [dedupAlgo, setDedupAlgo] = useState('combined');
  const [dedupResults, setDedupResults] = useState(null);
  const [dedupBusy, setDedupBusy] = useState(false);
  const [dedupMsg, setDedupMsg] = useState('');

  // Drag state
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkGroq(); refreshJobs(); loadRules();
    try { setGuideVotes(JSON.parse(localStorage.getItem('dcai_guide_votes') || '{}')); } catch {}
  }, []);

  function voteGuide(id, dir) {
    setGuideVotes(v => {
      const cur = v[id] || { up: 0, down: 0 };
      const next = { ...v, [id]: { ...cur, [dir]: cur[dir] + 1 } };
      try { localStorage.setItem('dcai_guide_votes', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // ── Groq ─────────────────────────────────────────────────
  async function checkGroq() {
    setGroqStatus('checking');
    try {
      const r = await fetch('/api/groq/status');
      const d = await r.json();
      setGroqStatus(d.status);
      if (d.models) setGroqModels(d.models);
    } catch {
      setGroqStatus('error');
    }
  }

  async function askGroq(prompt, system = '') {
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, system, model: currentModel }),
      });
      const d = await r.json();
      if (!r.ok) return `Error: ${d.error || 'Groq API error.'}`;
      return d.reply || 'No response.';
    } catch (e) {
      return `Request failed: ${e.message}`;
    }
  }

  // ── Data loading ─────────────────────────────────────────
  function loadSample(key) {
    const s = SAMPLES[key];
    setRawData(s);
    setStats({ total: s.rows.length, issues: 0, fixed: 0, review: 0 });
    setDedupCols(s.headers.map(() => false));
    setCleanedData([]); setAuditEntries([]); setDqScore(null);
    setAgentHistory([]);
    setCleanseMsgs([{ cls: 'sys', text: 'Hi, I\'m your AI data assistant 👋 Ask me anything — data standards, key fields for a system like SAP, or tell me what to clean, e.g. "standardize the country column" or "what are the key columns for a Material master in SAP?".' }]);
    setTab('ingest');
  }

  function parseFile(file) {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.data[0];
        const rows = res.data.slice(1).map(r => headers.map((_, i) => r[i] || ''));
        setRawData({ headers, rows });
        setStats({ total: rows.length, issues: 0, fixed: 0, review: 0 });
        setDedupCols(headers.map(() => false));
        setCleanedData([]); setAuditEntries([]); setDqScore(null);
        setAgentHistory([]);
        setCleanseMsgs([{ cls: 'sys', text: 'Hi, I\'m your AI data assistant 👋 Ask me anything — data standards, key fields for a system like SAP, or tell me what to clean, e.g. "standardize the country column" or "what are the key columns for a Material master in SAP?".' }]);
      },
    });
  }

  function clearAll() {
    setRawData(null); setCleanedData([]); setAuditEntries([]);
    setStats({ total: 0, issues: 0, fixed: 0, review: 0 }); setDqScore(null);
  }

  // ── Profile ──────────────────────────────────────────────
  function runProfile() {
    if (!rawData) return;
    const { headers, rows } = rawData;
    const cards = headers.map((col, ci) => {
      const vals = rows.map(r => r[ci] || '');
      const empty = vals.filter(v => !v.trim()).length;
      const nonEmpty = vals.filter(v => v.trim());
      const unique = new Set(nonEmpty).size;
      const fill = Math.round((1 - empty / vals.length) * 100);
      const issues = [];
      if (/email/i.test(col)) nonEmpty.filter(v => !v.includes('@')).length && issues.push('Invalid email');
      if (/phone|mobile/i.test(col)) nonEmpty.filter(v => v.replace(/\D/g, '').length < 10).length && issues.push('Short phone');
      if (nonEmpty.some(v => v === v.toUpperCase() && v.length > 2) && nonEmpty.some(v => v === v.toLowerCase() && v.length > 2)) issues.push('Mixed casing');
      return { col, fill, empty, unique, issues };
    });
    setProfileData(cards);
    setTab('profile');
  }

  // ── Cleanse ──────────────────────────────────────────────
  function runCleanse() {
    if (!rawData) return;
    setCleanseBusy(true);
    setCleanseMsg('');
    setTimeout(() => {
      const results = [];
      const audit = [];
      rawData.rows.forEach((row, i) => {
        const r = cleanseRow(row, rawData.headers, rules);
        r.id = i + 1;
        results.push(r);
        r.changes.forEach(c => audit.push({ ts: new Date().toLocaleTimeString(), rec: i + 1, field: c.field, from: c.from, to: c.to, rule: c.rule, conf: r.confidence }));
        r.issues.forEach(iss => audit.push({ ts: new Date().toLocaleTimeString(), rec: i + 1, field: '—', from: iss, to: '', rule: 'ISSUE', conf: r.confidence }));
      });
      const fixed = results.filter(r => r.changes.length > 0).length;
      const review = results.filter(r => r.status === 'review').length;
      const issueCount = results.filter(r => r.issues.length).length;
      const score = Math.round((results.length - review) / results.length * 100);
      setCleanedData(results);
      setAuditEntries(audit);
      setStats({ total: rawData.rows.length, issues: issueCount, fixed, review });
      setDqScore(score);
      setCleanseMsg(`✓ Done — ${fixed} fixed, ${review} flagged`);
      setCleanseBusy(false);
    }, 600);
  }

  function exportClean() {
    if (!cleanedData.length || !rawData) return;
    const csv = Papa.unparse({ fields: rawData.headers, data: cleanedData.map(r => r.cleaned) });
    download(csv, 'cleaned_data.csv');
  }

  function exportAudit() {
    if (!auditEntries.length) return;
    const csv = Papa.unparse(auditEntries);
    download(csv, 'audit_trail.csv');
  }

  function download(csv, name) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  // ── AI chat ──────────────────────────────────────────────
  async function aiRules() {
    const p = rulesInput.trim(); if (!p) return;
    setRulesInput('');
    setRulesMsgs(m => [...m, { cls: 'usr', text: p }, { cls: 'sys loading', text: '...' }]);
    setChatBusy(true);

    const ctx = rawData ? `Available columns: ${rawData.headers.join(', ')}.` : '';
    const system = `You are a data quality engineer. Output ONLY a JSON array. Each item: {"field":"column name","type":"short label","action":"one of: trim|title_case|upper_case|lower_case|validate_email|normalize_phone|std_country|title_case_city|std_state_code|normalize_currency|normalize_decimal|remove_special|custom","expression":"JS expr using value (only when action is custom)","description":"what it does"}. Use custom+expression for anything not covered by predefined actions.`;

    const reply = await askGroq(`${ctx ? ctx + '\n' : ''}Create cleansing rules for: ${p}`, system);

    try {
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      const parsed = JSON.parse(jsonMatch[0]);

      const saved = [];
      for (const rule of parsed) {
        const r = await fetch('/api/rules', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: rule.field || '', type: rule.type || rule.action, action: rule.action || 'custom', expression: rule.expression || '', description: rule.description || '', active: true }),
        });
        const d = await r.json();
        if (r.ok) saved.push(d.rule);
      }
      setRules(existing => [...existing, ...saved]);
      setRulesMsgs(m => [...m.filter(x => x.cls !== 'sys loading'), { cls: 'res', text: `✓ Added ${saved.length} rule(s) to your ruleset: ${saved.map(r => `${r.field} → ${r.action}`).join(', ')}` }]);
    } catch (e) {
      setRulesMsgs(m => [...m.filter(x => x.cls !== 'sys loading'), { cls: 'err', text: `Failed to parse rules: ${e.message}` }]);
    }
    setChatBusy(false);
  }

  async function aiChat() {
    const p = cleanseInput.trim(); if (!p) return;
    setCleanseInput('');
    setCleanseMsgs(m => [...m, { cls: 'usr', text: p }, { cls: 'sys loading', text: '...' }]);
    setChatBusy(true);

    // Convert array rows → objects for the agent (only when a dataset is loaded)
    const objRows = rawData
      ? rawData.rows.map(row => Object.fromEntries(rawData.headers.map((h, i) => [h, row[i] ?? ''])))
      : [];

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: p,
          history: agentHistory,
          headers: rawData ? rawData.headers : [],
          rows: objRows,
          userRules: rules,
          systemContext,
          model: currentModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent error');

      // Convert object rows back → arrays and update rawData (only if a dataset was loaded)
      if (rawData) {
        const newHeaders = data.headers;
        const newRows = data.rows.map(obj => newHeaders.map(h => obj[h] ?? ''));
        setRawData({ headers: newHeaders, rows: newRows });
        setStats(s => ({ ...s, total: newRows.length }));
      }

      // Persist conversation so the agent remembers context
      setAgentHistory(h => [...h, { role: 'user', content: p }, { role: 'assistant', content: data.reply }]);

      const toolSummary = data.toolLog?.length
        ? data.toolLog.map(t => `→ ${t.tool}(${Object.entries(t.args).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})`).join('\n')
        : null;

      setCleanseMsgs(m => [
        ...m.filter(x => x.cls !== 'sys loading'),
        { cls: 'res', text: data.reply, toolLog: toolSummary },
      ]);
    } catch (err) {
      setCleanseMsgs(m => [...m.filter(x => x.cls !== 'sys loading'), { cls: 'err', text: err.message }]);
    }
    setChatBusy(false);
    setTimeout(() => cleanseMsgsRef.current?.scrollTo(0, 99999), 50);
  }

  // ── Fuzzy Dedup ──────────────────────────────────────────
  function runDedup() {
    if (!rawData) return;
    setDedupBusy(true); setDedupMsg('');
    setTimeout(() => {
      const { headers, rows } = rawData;
      const activeCols = dedupCols.map((c, i) => c ? i : -1).filter(i => i >= 0);
      const colIdxs = activeCols.length ? activeCols : headers.map((_, i) => i);
      const threshold = dedupThreshold / 100;
      const pairs = [];
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const colSims = colIdxs.map(ci => ({ col: headers[ci], sim: stringSim(rows[i][ci], rows[j][ci], dedupAlgo) }));
          const overall = colSims.reduce((s, c) => s + c.sim, 0) / colSims.length;
          if (overall >= threshold) pairs.push({ i, j, overall, colSims });
        }
      }
      const exactCount = pairs.filter(p => p.overall >= 0.99).length;
      const groups = new Set(pairs.flatMap(p => [p.i, p.j])).size;
      setDedupResults({ total: (rows.length * (rows.length - 1)) / 2, found: pairs.length, exact: exactCount, groups, pairs });
      setDedupMsg(`Found ${pairs.length} duplicate pair(s)`);
      setDedupBusy(false);
    }, 300);
  }

  // ── Rules (DB-backed) ─────────────────────────────────────
  async function loadRules() {
    setRulesLoading(true);
    try {
      const r = await fetch('/api/rules');
      const d = await r.json();
      if (r.ok) setRules(d.rules || []);
    } catch {}
    setRulesLoading(false);
  }

  async function deleteRule(id) {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    setRules(rs => rs.filter(x => x.id !== id));
  }

  async function toggleRule(id, active) {
    setRules(rs => rs.map(x => x.id === id ? { ...x, active } : x)); // optimistic
    await fetch(`/api/rules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) });
  }

  async function resetRules() {
    if (!confirm('Delete all your saved rules? This cannot be undone.')) return;
    await Promise.all(rules.map(r => fetch(`/api/rules/${r.id}`, { method: 'DELETE' })));
    setRules([]);
  }

  // ── Jobs ─────────────────────────────────────────────────
  function refreshJobs() {
    fetch('/api/jobs').then(r => r.json()).then(d => setPastJobs(d.jobs || [])).catch(() => {});
  }

  // ── Render ────────────────────────────────────────────────
  const groqBadgeClass = groqStatus === 'online' ? 'b-grn' : groqStatus === 'no_key' ? 'b-red' : groqStatus === 'error' ? 'b-red' : 'b-warn';
  const groqBadgeText = groqStatus === 'online' ? 'Groq: Online' : groqStatus === 'no_key' ? 'Groq: No API Key' : groqStatus === 'error' ? 'Groq: Error' : 'Groq: Checking...';
  const dqColor = dqScore === null ? 'var(--mut)' : dqScore >= 80 ? 'var(--grn)' : dqScore >= 60 ? 'var(--warn)' : 'var(--red)';

  return (
    <>
      {/* Header */}
      <div className="hdr">
        <div className="logo">DataCleanse<span>AI</span></div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span className="badge b-pur">Groq Powered</span>
          <span className={`badge ${groqBadgeClass}`}>{groqBadgeText}</span>
          <SignedOut><SignInButton mode="modal"><button className="btn btn-g btn-sm">Sign In</button></SignInButton></SignedOut>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>
      </div>

      <div className="layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="nl">Pipeline</div>
          {TABS.map(t => (
            <button key={t} className={`ni${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); if (t === 'profile' && rawData) runProfile(); }}>
              {NAV_LABELS[t]}
            </button>
          ))}

          <div className="nl">Quality Score</div>
          <div className="dq-blk">
            <div className="dq-num" style={{ color: dqColor }}>{dqScore !== null ? dqScore + '%' : '—'}</div>
            <div className="dq-lbl">DQ Score</div>
            <div className="dq-track">
              <div className="dq-fill" style={{ width: (dqScore || 0) + '%', background: dqColor }} />
            </div>
          </div>

          <div className="nl">Sample Data</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <button className="btn btn-g btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => loadSample('customer')}>👤 Customer Master</button>
            <button className="btn btn-g btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => loadSample('product')}>📦 Product Data</button>
            <button className="btn btn-g btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => loadSample('address')}>📍 Address List</button>
          </div>

          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mut)', paddingTop: 10, borderTop: '1px solid var(--bdr)', marginTop: 10, lineHeight: 1.9 }}>
            Model: <span style={{ color: 'var(--pur)' }}>{currentModel.split('-').slice(0,2).join('-')}</span><br />
            Session: <span style={{ color: 'var(--txt)' }}>{sessionId()}</span>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          {/* Stats bar */}
          <div className="stats">
            <div className="stat"><div className="sv blue">{stats.total}</div><div className="sl">Total Records</div></div>
            <div className="stat"><div className="sv warn">{stats.issues}</div><div className="sl">Issues Found</div></div>
            <div className="stat"><div className="sv green">{stats.fixed}</div><div className="sl">AI Fixed</div></div>
            <div className="stat"><div className="sv red">{stats.review}</div><div className="sl">Needs Review</div></div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); if (t === 'profile' && rawData) runProfile(); }}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="content">
            {/* GUIDES */}
            {tab === 'guides' && (
              <div>
                <div className="flex-row">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Getting Started Guides</span>
                  <span style={{ fontSize: 11, color: 'var(--mut)', fontFamily: 'var(--mono)' }}>{GUIDES.length} GUIDES</span>
                </div>
                <div className="gd-grid">
                  {GUIDES.map(g => {
                    const votes = guideVotes[g.id] || { up: 0, down: 0 };
                    return (
                      <div className="gd-card" key={g.id}>
                        <div className="gd-top">
                          <div className="gd-icon">{g.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="gd-title">{g.title}</div>
                            <div className="gd-author">by DataCleanseAI Team</div>
                          </div>
                        </div>
                        <div className="gd-desc">{g.desc}</div>
                        <div className="gd-foot">
                          <button className="gd-play" title="Open this section" onClick={() => { setTab(g.tab); if (g.tab === 'profile' && rawData) runProfile(); }}>▶</button>
                          <button className="gd-vote" onClick={() => voteGuide(g.id, 'up')}>👍 {votes.up}</button>
                          <button className="gd-vote" onClick={() => voteGuide(g.id, 'down')}>👎 {votes.down}</button>
                          <span style={{ flex: 1 }} />
                          <span className={`tag ${g.level === 'Beginner' ? 't-ok' : 't-warn'}`}>{g.level}</span>
                          <span className="gd-dur">{g.duration}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* INGEST */}
            {tab === 'ingest' && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Load Your Data</div>
                <div className="info">
                  <strong>Powered by Groq.</strong> AI features use the Groq API (fast inference).
                  Rule-based cleansing works even without an API key. Check the AI Setup tab to configure your model.
                </div>
                <div
                  className={`upload-zone${dragging ? ' drag' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]); }}
                >
                  <div className="upload-icon">⬆</div>
                  <div className="upload-title">Drop file here or click to browse</div>
                  <div className="upload-sub">CSV · Excel (.xlsx/.xls) · JSON</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={e => e.target.files[0] && parseFile(e.target.files[0])} />

                {rawData && (
                  <>
                    <hr className="divider" />
                    <div className="flex-row">
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Raw Data Preview</span>
                      <button className="btn btn-p btn-sm" onClick={runProfile}>▶ Profile Data</button>
                      <button className="btn btn-g btn-sm" onClick={clearAll}>✕ Clear</button>
                    </div>
                    <div className="tbl-wrap"><div className="tbl-scroll">
                      <table className="tbl">
                        <thead><tr>{rawData.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>{rawData.rows.map((row, i) => (
                          <tr key={i}>{row.map((c, j) => <td key={j}>{c || <span className="ce">∅</span>}</td>)}</tr>
                        ))}</tbody>
                      </table>
                    </div></div>
                  </>
                )}
              </div>
            )}

            {/* PROFILE */}
            {tab === 'profile' && (
              <div>
                <div className="flex-row">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Data Quality Profile</span>
                  <button className="btn btn-p btn-sm" onClick={() => setTab('rules')}>Configure Rules →</button>
                </div>
                {profileData ? (
                  <div className="pg">
                    {profileData.map(({ col, fill, empty, unique, issues }) => {
                      const q = fill > 90 ? 'var(--grn)' : fill > 60 ? 'var(--warn)' : 'var(--red)';
                      return (
                        <div className="pc" key={col}>
                          <div className="pcn"><span style={{ color: q }}>●</span>{col}</div>
                          <div className="psr"><span className="psl">Fill rate</span><span style={{ color: q }}>{fill}%</span></div>
                          <div className="psr"><span className="psl">Empty</span><span style={{ color: empty ? 'var(--warn)' : 'var(--grn)' }}>{empty}</span></div>
                          <div className="psr"><span className="psl">Unique</span><span>{unique}</span></div>
                          <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {issues.length ? issues.map(iss => <span key={iss} className="tag t-rev">{iss}</span>) : <span className="tag t-ok">Clean</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="info">Load data first, then click "Profile Data".</div>
                )}
              </div>
            )}

            {/* RULES */}
            {tab === 'rules' && (
              <div>
                <div className="flex-row">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Cleansing Rules</span>
                  <button className="btn btn-g btn-sm" onClick={resetRules}>↺ Reset</button>
                </div>
                {rulesLoading && <div className="info"><span className="spin" /> Loading your rules...</div>}
                {!rulesLoading && rules.length === 0 && <div className="info">No rules. Add one or ask Groq.</div>}
                {rules.map(r => (
                  <div className="rc" key={r.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{r.type}</span>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', color: 'var(--mut)' }}>
                          <input type="checkbox" checked={r.active} onChange={e => toggleRule(r.id, e.target.checked)} /> Active
                        </label>
                        <button className="btn btn-d btn-sm" onClick={() => deleteRule(r.id)}>✕</button>
                      </div>
                    </div>
                    <div className="rr">
                      <div>
                        <div className="inp-lbl">Field</div>
                        <input className="inp" value={r.field} onChange={e => setRules(rs => rs.map(x => x.id === r.id ? { ...x, field: e.target.value } : x))} onBlur={async (e) => { await fetch(`/api/rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: r.field }) }); }} />
                      </div>
                      <div>
                        <div className="inp-lbl">Rule Type</div>
                        <input className="inp" value={r.type} onChange={e => setRules(rs => rs.map(x => x.id === r.id ? { ...x, type: e.target.value } : x))} onBlur={async (e) => { await fetch(`/api/rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: r.type }) }); }} />
                      </div>
                      <div>
                        <div className="inp-lbl">Action</div>
                        <select className="inp" value={r.action} onChange={e => setRules(rs => rs.map(x => x.id === r.id ? { ...x, action: e.target.value } : x))} onBlur={async (e) => { await fetch(`/api/rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: r.action }) }); }}>
                          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <span className={`tag ${r.active ? 't-ok' : 't-warn'}`}>{r.active ? 'ON' : 'OFF'}</span>
                    </div>
                    {r.action === 'custom' && (
                      <div style={{ marginTop: 8 }}>
                        <div className="inp-lbl">JS Expression <span style={{color:'var(--mut)',fontWeight:400}}>— use `value` as the cell string</span></div>
                        <textarea
                          className="inp"
                          rows={2}
                          style={{ width: '100%', resize: 'vertical', marginTop: 3 }}
                          placeholder="e.g. value.replace(/\\D+/g, '').slice(-10)"
                          value={r.expression || ''}
                          onChange={e => setRules(rs => rs.map(x => x.id === r.id ? { ...x, expression: e.target.value } : x))}
                          onBlur={async (e) => { await fetch(`/api/rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expression: e.target.value }) }); }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="ai-panel">
                  <div className="ai-hdr"><span className="ai-pulse" />Ask Groq to Generate Rules</div>
                  <div className="ai-msgs">
                    {rulesMsgs.map((m, i) => <div key={i} className={`am ${m.cls}`}>{m.cls === 'sys loading' ? <span className="spin" /> : m.text}</div>)}
                  </div>
                  <div className="ai-inp-row">
                    <input className="ai-inp" value={rulesInput} placeholder='e.g. "add rules for name, email and phone columns"'
                      onChange={e => setRulesInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !chatBusy && aiRules()} />
                    <button className="btn btn-p btn-sm" onClick={aiRules} disabled={chatBusy}>Ask</button>
                  </div>
                </div>
              </div>
            )}

            {/* CLEANSE */}
            {tab === 'cleanse' && (
              <div>
                {/* AI Agent — works with or without a loaded dataset */}
                <div className="ai-panel" style={{ marginBottom: 16 }}>
                  <div className="ai-hdr"><span className="ai-pulse" />Groq AI Agent — ask me anything or tell me what to fix</div>
                  {!rawData && (
                    <div className="info" style={{ marginBottom: 10 }}>
                      No dataset loaded — you can still ask general questions (e.g. "what are the key columns for a Material master in SAP?"). Load a file from the Ingest tab to also clean data.
                    </div>
                  )}
                  <div className="ai-msgs" ref={cleanseMsgsRef} style={{ maxHeight: 220 }}>
                    {cleanseMsgs.map((m, i) => (
                      <div key={i} className={`am ${m.cls}`}>
                        {m.cls === 'sys loading' ? <><span className="spin" /> Groq is working...</> : m.text}
                        {m.toolLog && <div style={{ marginTop: 5, fontSize: 10, color: 'var(--mut)', whiteSpace: 'pre' }}>{m.toolLog}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="ai-inp-row">
                    <input className="ai-inp" value={cleanseInput}
                      placeholder={rawData ? `e.g. "title case the Name column", "fix emails", "remove duplicates"` : `e.g. "key columns for Material master in SAP"`}
                      disabled={chatBusy}
                      onChange={e => setCleanseInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !chatBusy && aiChat()} />
                    <button className="btn btn-p btn-sm" onClick={aiChat} disabled={chatBusy}>
                      {chatBusy ? <span className="spin" /> : 'Send'}
                    </button>
                  </div>
                </div>

                {rawData && <>
                  {/* Live data preview — always shows current rawData state */}
                  <div style={{ marginBottom: 14 }}>
                    <div className="flex-row">
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Live Data Preview</span>
                      <span style={{ fontSize: 11, color: 'var(--mut)', fontFamily: 'var(--mono)' }}>{rawData.rows.length} rows · {rawData.headers.length} cols</span>
                      <button className="btn btn-g btn-sm" onClick={() => { const csv = Papa.unparse({ fields: rawData.headers, data: rawData.rows }); download(csv, 'data.csv'); }}>↓ Download CSV</button>
                      {agentHistory.length > 0 && (
                        <button className="btn btn-d btn-sm" onClick={() => { setAgentHistory([]); setCleanseMsgs([{ cls: 'sys', text: 'Hi, I\'m your AI data assistant 👋 Ask me anything — data standards, key fields for a system like SAP, or tell me what to clean, e.g. "standardize the country column" or "what are the key columns for a Material master in SAP?".' }]); }}>
                          ↺ Reset chat
                        </button>
                      )}
                    </div>
                    <div className="tbl-wrap"><div className="tbl-scroll">
                      <table className="tbl">
                        <thead><tr>{rawData.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>{rawData.rows.slice(0, 50).map((row, i) => (
                          <tr key={i}>{row.map((c, j) => <td key={j}>{c || <span className="ce">∅</span>}</td>)}</tr>
                        ))}</tbody>
                      </table>
                    </div></div>
                  </div>

                  {/* Rule-based cleanse — secondary */}
                  <details style={{ border: '1px solid var(--bdr)', borderRadius: 8, padding: '10px 14px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 12, color: 'var(--mut)' }}>⚙️ Rule-Based Cleanse (optional — runs on top of AI changes)</summary>
                    <div style={{ marginTop: 12 }}>
                      <div className="flex-row">
                        <button className="btn btn-p btn-sm" onClick={runCleanse} disabled={cleanseBusy}>⚡ Run Rules</button>
                        {cleanedData.length > 0 && <>
                          <button className="btn btn-g btn-sm" onClick={exportClean}>↓ Clean CSV</button>
                          <button className="btn btn-g btn-sm" onClick={exportAudit}>↓ Audit CSV</button>
                        </>}
                        <span style={{ fontSize: 11, color: cleanseMsg.startsWith('✓') ? 'var(--grn)' : 'var(--mut)' }}>
                          {cleanseBusy ? <><span className="spin" /> Processing...</> : cleanseMsg}
                        </span>
                      </div>
                      {cleanedData.length > 0 && (
                        <div className="tbl-wrap" style={{ marginTop: 10 }}><div className="tbl-scroll">
                          <table className="tbl">
                            <thead><tr>
                              <th>Status</th>
                              {rawData.headers.map(h => <th key={h}>{h}</th>)}
                              <th>Conf.</th>
                            </tr></thead>
                            <tbody>{cleanedData.map(rec => {
                              const conf = Math.round(rec.confidence * 100);
                              const cc = conf > 90 ? 'var(--grn)' : conf > 70 ? 'var(--warn)' : 'var(--red)';
                              const tag = rec.status === 'ok' ? 't-ok' : rec.status === 'fixed' ? 't-fix' : 't-rev';
                              const lbl = rec.status === 'ok' ? '✓ Clean' : rec.status === 'fixed' ? '⚡ Fixed' : '⚠ Review';
                              return (
                                <tr key={rec.id}>
                                  <td><span className={`tag ${tag}`}>{lbl}</span></td>
                                  {rawData.headers.map((h, i) => {
                                    const o = rec.original[i], c = rec.cleaned[i];
                                    return o !== c
                                      ? <td key={h}><span className="co">{o || '∅'}</span><span className="cc">{c}</span></td>
                                      : <td key={h}>{c || <span className="ce">∅</span>}</td>;
                                  })}
                                  <td>
                                    <div className="cf">
                                      <div className="cf-track"><div className="cf-fill" style={{ width: conf + '%', background: cc }} /></div>
                                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: cc, minWidth: 30 }}>{conf}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                        </div></div>
                      )}
                    </div>
                  </details>
                </>}
              </div>
            )}

            {/* AUDIT */}
            {tab === 'audit' && (
              <div>
                <div className="flex-row">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Full Audit Trail</span>
                  {auditEntries.length > 0 && <button className="btn btn-g btn-sm" onClick={exportAudit}>↓ Export CSV</button>}
                </div>
                {auditEntries.length === 0
                  ? <div className="info">Run a cleanse to generate audit entries.</div>
                  : auditEntries.map((e, i) => (
                    <div className="le" key={i}>
                      <div className="lt">{e.ts}</div>
                      <div style={{ flex: 1 }}>
                        <div>
                          <span className={`tag ${e.to ? 't-fix' : 't-rev'}`} style={{ marginRight: 5 }}>{e.to ? 'CHANGE' : 'ISSUE'}</span>
                          <strong>Rec #{e.rec}</strong> — <span className="blue">{e.field}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mut)', marginLeft: 7 }}>[{e.rule}]</span>
                        </div>
                        {e.to
                          ? <div className="lc">"{e.from || '∅'}"<span className="la">→</span>"{e.to}"</div>
                          : <div className="lc" style={{ color: 'var(--red)' }}>{e.from}</div>
                        }
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* FUZZY DEDUP */}
            {tab === 'dedup' && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>🔁 Fuzzy Duplicate Detection</div>
                <div className="info" style={{ marginBottom: 14 }}>
                  <strong>Generic:</strong> works on any dataset. Select which columns to compare, set a similarity threshold, and click Run.
                </div>
                <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div className="inp-lbl">Compare Columns <span style={{ color: 'var(--mut)', fontWeight: 400 }}>(leave all unchecked = use ALL)</span></div>
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto', padding: 4 }}>
                        {rawData ? rawData.headers.map((h, i) => (
                          <label key={h} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', cursor: 'pointer', color: 'var(--txt)' }}>
                            <input type="checkbox" checked={dedupCols[i] || false}
                              onChange={e => setDedupCols(c => { const n = [...c]; n[i] = e.target.checked; return n; })} />
                            {h}
                          </label>
                        )) : <span style={{ color: 'var(--mut)', fontSize: 11, fontFamily: 'var(--mono)' }}>Load data first to see columns</span>}
                      </div>
                    </div>
                    <div>
                      <div className="inp-lbl">Similarity Threshold</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 14 }}>
                        <input type="range" min="50" max="99" value={dedupThreshold}
                          onChange={e => setDedupThreshold(Number(e.target.value))}
                          style={{ flex: 1, accentColor: 'var(--grn)' }} />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: 'var(--grn)', minWidth: 38 }}>{dedupThreshold}%</span>
                      </div>
                      <div className="inp-lbl">Algorithm</div>
                      <select className="inp model-select" value={dedupAlgo} onChange={e => setDedupAlgo(e.target.value)} style={{ marginTop: 6 }}>
                        <option value="combined">Combined (Levenshtein + Token) — Recommended</option>
                        <option value="levenshtein">Levenshtein only (character edit distance)</option>
                        <option value="token">Token only (word overlap)</option>
                      </select>
                      <div style={{ marginTop: 14 }}>
                        <button className="btn btn-p" onClick={runDedup} disabled={dedupBusy || !rawData}>🔁 Find Duplicates</button>
                        <span style={{ fontSize: 11, color: 'var(--mut)', marginLeft: 10 }}>{dedupMsg}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {dedupResults && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { val: dedupResults.total, label: 'Pairs Checked', color: 'var(--blu)' },
                        { val: dedupResults.found, label: 'Duplicates Found', color: 'var(--warn)' },
                        { val: dedupResults.exact, label: 'Exact Matches', color: 'var(--red)' },
                        { val: dedupResults.groups, label: 'Dup Clusters', color: 'var(--pur)' },
                      ].map(({ val, label, color }) => (
                        <div key={label} style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 7, padding: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {dedupResults.pairs.length === 0
                      ? <div className="info">No duplicates found above threshold.</div>
                      : <div className="tbl-wrap"><div className="tbl-scroll">
                        <table className="tbl">
                          <thead><tr>
                            <th>Row A</th><th>Row B</th><th>Overall</th>
                            {rawData.headers.map(h => <th key={h}>{h}</th>)}
                          </tr></thead>
                          <tbody>{dedupResults.pairs.slice(0, 100).map((p, idx) => (
                            <tr key={idx}>
                              <td>#{p.i + 1}</td><td>#{p.j + 1}</td>
                              <td><span style={{ color: p.overall >= 0.99 ? 'var(--red)' : 'var(--warn)', fontWeight: 700 }}>{Math.round(p.overall * 100)}%</span></td>
                              {rawData.headers.map((h, hi) => {
                                const sim = p.colSims.find(c => c.col === h);
                                return <td key={h} style={{ color: sim && sim.sim >= 0.9 ? 'var(--grn)' : 'var(--txt)' }}>
                                  {rawData.rows[p.i][hi]} / {rawData.rows[p.j][hi]}
                                </td>;
                              })}
                            </tr>
                          ))}</tbody>
                        </table>
                      </div></div>
                    }
                  </>
                )}
                {!dedupResults && <div className="info">Configure options above and click "Find Duplicates".</div>}
              </div>
            )}

            {/* DATABASE */}
            {tab === 'db' && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>🗄️ Cleanse Job History</div>
                <div className="info" style={{ marginBottom: 14 }}>
                  <strong>Past cleanse jobs</strong> saved to your account.
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button className="btn btn-g btn-sm" onClick={refreshJobs}>↺ Refresh</button>
                </div>
                {pastJobs.length === 0
                  ? <div className="info">No jobs saved yet. Run a cleanse and save to your account.</div>
                  : pastJobs.map(j => (
                    <div key={j.id} style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 13, marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{j.filename}</div>
                        <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 3 }}>
                          {j.row_count ?? '?'} rows · {j.status} · {new Date(j.created_at).toLocaleString()}
                        </div>
                      </div>
                      {j.downloadUrl && <a href={j.downloadUrl}><button className="btn btn-g btn-sm">↓ Download</button></a>}
                    </div>
                  ))
                }
              </div>
            )}

            {/* AI SETUP */}
            {tab === 'setup' && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>AI Setup — Groq Configuration</div>

                <div className="oll-card">
                  <div className="oll-row">
                    <div className="oll-title">
                      <span className={`oll-dot ${groqStatus === 'online' ? 'on' : 'off'}`} />
                      Groq API Status
                    </div>
                    <button className="btn btn-g btn-sm" onClick={checkGroq}>↺ Refresh</button>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--mut)', marginBottom: 12 }}>
                    {groqStatus === 'checking' && 'Checking...'}
                    {groqStatus === 'online' && <span style={{ color: 'var(--grn)' }}>Connected · {groqModels.length} model(s) available</span>}
                    {groqStatus === 'no_key' && <span style={{ color: 'var(--red)' }}>GROQ_API_KEY not set — add it to <code style={{ background: 'var(--surf2)', padding: '1px 6px', borderRadius: 3 }}>.env.local</code> and restart</span>}
                    {groqStatus === 'error' && <span style={{ color: 'var(--red)' }}>Could not reach Groq API. Check your key and network.</span>}
                  </div>
                  <div className="inp-lbl">Active Model</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <select className="model-select" value={currentModel} onChange={e => setCurrentModel(e.target.value)}>
                      {GROQ_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="oll-card">
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>Quick Setup Guide</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 2, color: 'var(--mut)' }}>
                    <div><span style={{ color: 'var(--grn)' }}>1.</span> Sign up at <span style={{ color: 'var(--blu)' }}>console.groq.com</span> (free)</div>
                    <div><span style={{ color: 'var(--grn)' }}>2.</span> Create an API key under API Keys</div>
                    <div><span style={{ color: 'var(--grn)' }}>3.</span> Add to your project: <code style={{ background: 'var(--surf2)', padding: '1px 6px', borderRadius: 3, color: 'var(--txt)' }}>GROQ_API_KEY=gsk_...</code> in <code style={{ background: 'var(--surf2)', padding: '1px 6px', borderRadius: 3, color: 'var(--txt)' }}>.env.local</code></div>
                    <div><span style={{ color: 'var(--grn)' }}>4.</span> Restart the dev server and click Refresh above</div>
                    <div style={{ marginTop: 10, color: 'var(--warn)' }}>Note: Groq free tier is generous — no credit card needed to get started.</div>
                  </div>
                </div>

                <div className="oll-card">
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Domain Context</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mut)', marginBottom: 8, lineHeight: 1.6 }}>
                    Tell the AI about your data domain. This is injected into every agent call so it behaves according to your rules — e.g. field formats, mandatory standards, domain-specific logic.
                  </div>
                  <textarea
                    className="inp"
                    rows={5}
                    style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
                    placeholder={`Examples:\n- This is pharmaceutical data. Drug names must be in UPPER_CASE.\n- NDC codes follow the format XXXXX-XXXX-XX. Validate and reformat them.\n- Country must always be the full ISO country name, never abbreviations.\n- Remove any row where Revenue is negative.`}
                    value={systemContext}
                    onChange={e => setSystemContext(e.target.value)}
                  />
                  <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--mut)' }}>
                    {systemContext.trim() ? `✓ ${systemContext.trim().split('\n').length} line(s) of domain context active` : 'No domain context set — AI uses generic data cleaning behaviour'}
                  </div>
                </div>

                <div className="oll-card">
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Model Comparison</div>
                  <table className="tbl" style={{ fontSize: 11 }}>
                    <thead><tr><th>Model</th><th>Context</th><th>Speed</th><th>Best For</th></tr></thead>
                    <tbody>
                      {[
                        ['llama-3.3-70b-versatile ★','128k','Fast','General cleansing (recommended)','var(--grn)'],
                        ['llama-3.1-8b-instant','128k','Fastest','Low-latency tasks'],
                        ['llama3-70b-8192','8k','Fast','Complex reasoning'],
                        ['mixtral-8x7b-32768','32k','Fast','Large context tasks'],
                        ['gemma2-9b-it','8k','Very fast','Efficient, good quality'],
                      ].map(([name, ctx, speed, best, color]) => (
                        <tr key={name}><td style={color ? { color } : {}}>{name}</td><td>{ctx}</td><td>{speed}</td><td>{best}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
