import { supabaseAdmin } from './supabaseAdmin';

export async function loadMemory(userId) {
  const sb = supabaseAdmin();
  const { data } = await sb.from('user_memory').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return { columnSettings: {}, valueCorrections: {} };
  return {
    columnSettings: data.column_settings || {},
    valueCorrections: data.value_corrections || {},
  };
}

export async function saveMemory(userId, memory) {
  const sb = supabaseAdmin();
  await sb.from('user_memory').upsert({
    user_id: userId,
    column_settings: memory.columnSettings,
    value_corrections: memory.valueCorrections,
    updated_at: new Date().toISOString(),
  });
}

// Merge newly-approved actions (from a completed cleaning) into this user's memory.
export async function learnFromActions(userId, actions) {
  const memory = await loadMemory(userId);
  for (const action of actions || []) {
    if (!action.column) continue;
    memory.columnSettings[action.column] = {
      trim: !!action.trim,
      case: action.case || 'none',
    };
    for (const [raw, corrected] of Object.entries(action.value_map || {})) {
      memory.valueCorrections[raw] = corrected;
    }
  }
  await saveMemory(userId, memory);
  return memory;
}

// Apply what's already known to a freshly-generated analysis, so confirmed
// past decisions take priority over a fresh (possibly incomplete) AI guess.
export function applyMemoryToAnalysis(analysis, columnSummaries, memory) {
  const actionsByCol = {};
  (analysis.actions || []).forEach((a) => (actionsByCol[a.column] = a));

  for (const { column, sample_values } of columnSummaries) {
    const known = memory.columnSettings[column];
    const knownValueFixes = {};
    for (const v of sample_values) {
      if (memory.valueCorrections[v] !== undefined) {
        knownValueFixes[v] = memory.valueCorrections[v];
      }
    }
    const hasKnownFixes = Object.keys(knownValueFixes).length > 0;
    if (!known && !hasKnownFixes) continue;

    if (!actionsByCol[column]) {
      actionsByCol[column] = { column, trim: false, case: 'none', value_map: {} };
    }
    const a = actionsByCol[column];
    if (known) {
      a.trim = a.trim || known.trim;
      if (a.case === 'none') a.case = known.case;
    }
    a.value_map = { ...(a.value_map || {}), ...knownValueFixes };
  }

  analysis.actions = Object.values(actionsByCol);
  return analysis;
}
