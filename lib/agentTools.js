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
      description:
        'See distinct sample values in a column and how many rows are missing a value there. Always call this before proposing a standardize_values mapping -- never guess corrections without seeing the real values.',
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
      description:
        'Replace inconsistent variant values in a column with one corrected value each, e.g. {"NY":"New York","N.Y.":"New York"}. Only use exact values you saw from inspect_column.',
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
      name: 'remove_duplicate_rows',
      description: 'Remove rows that are exact, byte-for-byte duplicates of another row.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_rows_with_missing',
      description:
        'Delete rows where a given column is empty or missing. This deletes rows -- it never invents a replacement value.',
      parameters: { type: 'object', properties: { column: { type: 'string' } }, required: ['column'] },
    },
  },
];

function uniqueValues(rows, column, cap = 30) {
  const vals = [...new Set(rows.map((r) => r[column]).filter((v) => v !== undefined && v !== null && v !== ''))];
  return vals.slice(0, cap);
}

// Executes one tool call against the working dataset (state.headers/state.rows).
// Mutates state.rows in place (or reassigns it for row-removal tools) and
// returns a small JSON-safe result -- never the full dataset -- for the model to read.
export function executeTool(name, args, state) {
  const { headers, rows } = state;

  if (name === 'summarize_data') {
    return { row_count: rows.length, columns: headers };
  }

  if (name === 'inspect_column') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    const missing = rows.filter((r) => !r[args.column]).length;
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
      if (args.case === 'title') s = v.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
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

  if (name === 'remove_duplicate_rows') {
    const seen = new Set();
    const before = rows.length;
    const deduped = [];
    for (const r of rows) {
      const key = JSON.stringify(r);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
    }
    state.rows = deduped;
    return { removed: before - deduped.length, remaining: deduped.length };
  }

  if (name === 'remove_rows_with_missing') {
    if (!headers.includes(args.column)) return { error: `No column named "${args.column}".` };
    const before = rows.length;
    state.rows = rows.filter((r) => r[args.column] !== undefined && r[args.column] !== null && r[args.column] !== '');
    return { removed: before - state.rows.length, remaining: state.rows.length };
  }

  return { error: `Unknown tool "${name}".` };
}
