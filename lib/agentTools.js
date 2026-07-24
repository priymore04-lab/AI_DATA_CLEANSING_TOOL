// ── Shared cleanse logic (used by both agent server and client rules engine) ──

export const COUNTRY_MAP = {
  'in':'India','ind':'India','india':'India','us':'United States','usa':'United States',
  'united states':'United States','uk':'United Kingdom','gb':'United Kingdom',
  'au':'Australia','aus':'Australia','ca':'Canada','sg':'Singapore','uae':'UAE','ae':'UAE',
};

export function applyAction(action, val, expression = '') {
  if (!val) return val;
  switch (action) {
    case 'trim': return val.trim();
    case 'title_case': return val.trim().replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    case 'upper_case': return val.trim().toUpperCase();
    case 'lower_case': return val.trim().toLowerCase();
    case 'validate_email': return val.trim().toLowerCase().replace(/@@+/g, '@').replace(/\s/g, '');
    case 'normalize_phone': { let d = val.replace(/\D/g, ''); if (d.startsWith('91') && d.length === 12) d = d.slice(2); if (d.startsWith('0') && d.length === 11) d = d.slice(1); return d; }
    case 'std_country': return COUNTRY_MAP[val.trim().toLowerCase()] || (val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase());
    case 'title_case_city': return val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
    case 'std_state_code': return val.trim().length <= 3 ? val.trim().toUpperCase() : val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
    case 'normalize_currency': return val.replace(/[^\d.]/g, '');
    case 'normalize_decimal': { const n = parseFloat(val.replace(/[^\d.\-]/g, '')); return isNaN(n) ? val : n.toString(); }
    case 'remove_special': return val.replace(/[^\w\s\-.]/g, '').trim();
    case 'custom': return expression ? runExpression(expression, val) : val;
    default: return val;
  }
}

// ── Tool definitions sent to Groq ────────────────────────────────────────────

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'summarize_data',
      description: 'Get row/column counts and column names for the currently loaded dataset.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inspect_column',
      description: 'See distinct sample values in a column and how many rows are missing a value there. Always call this before proposing a standardize_values mapping.',
      parameters: {
        type: 'object',
        properties: { column: { type: 'string' } },
        required: ['column'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trim_whitespace',
      description: 'Trim leading/trailing whitespace from every value in a column.',
      parameters: { type: 'object', properties: { column: { type: 'string' } }, required: ['column'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_case',
      description: 'Normalize the text case of every value in a column.',
      parameters: {
        type: 'object',
        properties: {
          column: { type: 'string' },
          case: { type: 'string', enum: ['title', 'upper', 'lower'] },
        },
        required: ['column', 'case'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'standardize_values',
      description: 'Replace inconsistent variant values in a column with one corrected value each. Only use exact values you saw from inspect_column.',
      parameters: {
        type: 'object',
        properties: {
          column: { type: 'string' },
          mapping: { type: 'object', additionalProperties: { type: 'string' } },
        },
        required: ['column', 'mapping'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_rule',
      description: 'Apply one of the user-defined cleansing rules to a column. Prefer this over other tools when a matching user rule exists for the column.',
      parameters: {
        type: 'object',
        properties: {
          column: { type: 'string' },
          action: {
            type: 'string',
            description: 'The action from the user\'s rule list, e.g. title_case, validate_email, normalize_phone, std_country, trim, upper_case, lower_case, std_state_code, normalize_currency, normalize_decimal, remove_special',
          },
        },
        required: ['column', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_transform',
      description: 'Apply a custom JavaScript expression to every value in a column. Use `value` as the current cell string. Use this for any transformation not covered by other tools — regex, slicing, formatting, etc.',
      parameters: {
        type: 'object',
        properties: {
          column: { type: 'string' },
          expression: {
            type: 'string',
            description: 'A JS expression using `value` (string) that returns the transformed string. Examples: "value.replace(/\\\\s+/g,\' \').trim()", "value.split(\'-\')[0]", "value.length > 0 ? value[0].toUpperCase()+value.slice(1).toLowerCase() : value"',
          },
          description: { type: 'string', description: 'Plain-English description of what this transform does.' },
        },
        required: ['column', 'expression', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_duplicate_rows',
      description: 'Remove rows that are exact, byte-for-byte duplicates of another row.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_rows_with_missing',
      description: 'Delete rows where a given column is empty or missing. This deletes rows — it never invents a replacement value.',
      parameters: { type: 'object', properties: { column: { type: 'string' } }, required: ['column'] },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

function uniqueValues(rows, column, cap = 30) {
  const vals = [...new Set(rows.map(r => r[column]).filter(v => v !== undefined && v !== null && v !== ''))];
  return vals.slice(0, cap);
}

// Safely evaluate a Groq-generated JS expression against a single value.
function runExpression(expression, value) {
  const blocked = ['require(', 'import(', 'process.', '__dirname', '__filename', 'eval(', 'Function(', 'fetch(', 'XMLHttpRequest'];
  for (const b of blocked) {
    if (expression.includes(b)) throw new Error(`Expression contains blocked keyword: ${b}`);
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function('value', `"use strict"; return (${expression});`);
  return String(fn(value) ?? value);
}

export function executeTool(name, args, state, userRules = []) {
  const { headers, rows } = state;

  if (name === 'summarize_data') {
    return { row_count: rows.length, columns: headers };
  }

  if (name === 'inspect_column') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    const missing = rows.filter(r => !r[args.column]).length;
    return { sample_values: uniqueValues(rows, args.column), missing_count: missing };
  }

  if (name === 'trim_whitespace') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    let changed = 0;
    for (const r of rows) {
      if (typeof r[args.column] === 'string') {
        const t = r[args.column].trim();
        if (t !== r[args.column]) changed++;
        r[args.column] = t;
      }
    }
    return { column: args.column, rows_changed: changed };
  }

  if (name === 'set_case') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    let changed = 0;
    for (const r of rows) {
      const v = r[args.column];
      if (typeof v !== 'string' || !v) continue;
      let s = v;
      if (args.case === 'title') s = v.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase());
      if (args.case === 'upper') s = v.toUpperCase();
      if (args.case === 'lower') s = v.toLowerCase();
      if (s !== v) changed++;
      r[args.column] = s;
    }
    return { column: args.column, case: args.case, rows_changed: changed };
  }

  if (name === 'standardize_values') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    const mapping = args.mapping || {};
    let changed = 0;
    for (const r of rows) {
      const v = r[args.column];
      if (v !== undefined && mapping[v] !== undefined) {
        r[args.column] = mapping[v];
        changed++;
      }
    }
    return { column: args.column, mapping, rows_changed: changed };
  }

  if (name === 'apply_rule') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    const matchedRule = userRules.find(r => r.active && r.field.toLowerCase() === args.column.toLowerCase() && r.action === args.action);
    if (!matchedRule && !args.action) return { error: `No active rule found for column "${args.column}" with action "${args.action}".` };
    const expr = matchedRule?.expression || '';
    let changed = 0;
    for (const r of rows) {
      const v = r[args.column] ?? '';
      const result = applyAction(args.action, v, expr);
      if (result !== v) { r[args.column] = result; changed++; }
    }
    return { column: args.column, action: args.action, rows_changed: changed };
  }

  if (name === 'run_transform') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    let changed = 0;
    const errors = [];
    for (const r of rows) {
      const v = r[args.column] ?? '';
      try {
        const result = runExpression(args.expression, v);
        if (result !== v) { r[args.column] = result; changed++; }
      } catch (e) {
        errors.push(e.message);
        break;
      }
    }
    if (errors.length) return { error: errors[0] };
    return { column: args.column, description: args.description, rows_changed: changed };
  }

  if (name === 'remove_duplicate_rows') {
    const seen = new Set();
    const before = rows.length;
    const deduped = [];
    for (const r of rows) {
      const key = JSON.stringify(r);
      if (!seen.has(key)) { seen.add(key); deduped.push(r); }
    }
    state.rows = deduped;
    return { removed: before - deduped.length, remaining: deduped.length };
  }

  if (name === 'remove_rows_with_missing') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    const before = rows.length;
    state.rows = rows.filter(r => r[args.column] !== undefined && r[args.column] !== null && r[args.column] !== '');
    return { removed: before - state.rows.length, remaining: state.rows.length };
  }

  return { error: `Unknown tool "${name}".` };
}
