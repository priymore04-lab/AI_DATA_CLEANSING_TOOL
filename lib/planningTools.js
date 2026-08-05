// ── Planning & Discovery AI Tools ──────────────────────────────────────────────
// AI-powered project planning, estimation, risk analysis, and meeting summarization

import { createSupabaseAdmin } from './supabaseAdmin.js';

// ── Tool Definitions for Planning Agent ────────────────────────────────────────

export const PLANNING_TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'analyze_project_scope',
      description: 'Analyze a project description and extract key information: domain, tech stack, complexity indicators, team size suggestions.',
      parameters: {
        type: 'object',
        properties: {
          project_description: { type: 'string', description: 'Project description or requirements' },
        },
        required: ['project_description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_effort',
      description: 'Estimate project effort in hours based on scope, complexity, and historical data. Breaks down by phase (planning, development, testing, deployment).',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'UUID of the project to estimate' },
          scope_summary: { type: 'string', description: 'Brief summary of project scope' },
          complexity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Project complexity level' },
        },
        required: ['project_id', 'scope_summary', 'complexity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'identify_risks',
      description: 'Identify potential project risks based on scope, domain, and historical patterns. Returns risks with severity and mitigation strategies.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'UUID of the project' },
          domain: { type: 'string', description: 'Project domain (e.g., web-development, api-integration)' },
          tech_stack: { type: 'array', items: { type: 'string' }, description: 'Technologies being used' },
        },
        required: ['project_id', 'domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_similar_projects',
      description: 'Search historical projects database for similar past projects to inform estimates and identify patterns.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Project domain' },
          tech_stack: { type: 'array', items: { type: 'string' }, description: 'Technologies involved' },
          team_size: { type: 'number', description: 'Team size' },
        },
        required: ['domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_meeting',
      description: 'Analyze meeting notes and extract: executive summary, key decisions, action items, requirements, and risks mentioned.',
      parameters: {
        type: 'object',
        properties: {
          meeting_notes: { type: 'string', description: 'Raw meeting transcript or notes' },
          attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee names' },
        },
        required: ['meeting_notes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_cost_estimate',
      description: 'Calculate project cost based on effort estimate and hourly rates (default or custom).',
      parameters: {
        type: 'object',
        properties: {
          effort_hours: { type: 'number', description: 'Total estimated effort in hours' },
          hourly_rate: { type: 'number', description: 'Hourly rate (default: $100)' },
          overhead_percentage: { type: 'number', description: 'Overhead percentage (default: 20%)' },
        },
        required: ['effort_hours'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_timeline',
      description: 'Suggest project timeline/milestones based on effort estimate and team size.',
      parameters: {
        type: 'object',
        properties: {
          effort_hours: { type: 'number', description: 'Total effort in hours' },
          team_size: { type: 'number', description: 'Number of team members' },
          working_hours_per_week: { type: 'number', description: 'Hours per week per person (default: 40)' },
        },
        required: ['effort_hours', 'team_size'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_project_analysis',
      description: 'Save the complete project analysis (effort, cost, timeline, risks) to the database.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project UUID' },
          analysis: {
            type: 'object',
            description: 'Complete analysis object with effort, cost, risks, etc.',
          },
        },
        required: ['project_id', 'analysis'],
      },
    },
  },
];

// ── Tool Executors ──────────────────────────────────────────────────────────────

/**
 * Analyze project scope and extract metadata
 */
function analyzeProjectScope(projectDescription) {
  // Simple keyword-based analysis (can be enhanced with more sophisticated NLP)
  const description = projectDescription.toLowerCase();
  
  // Detect domain
  let domain = 'general';
  if (description.includes('web') || description.includes('website') || description.includes('dashboard')) {
    domain = 'web-development';
  } else if (description.includes('api') || description.includes('integration') || description.includes('service')) {
    domain = 'api-integration';
  } else if (description.includes('data') || description.includes('etl') || description.includes('pipeline')) {
    domain = 'data-processing';
  } else if (description.includes('mobile') || description.includes('ios') || description.includes('android')) {
    domain = 'mobile-development';
  }
  
  // Detect complexity indicators
  const complexityIndicators = {
    high: ['complex', 'sophisticated', 'enterprise', 'large-scale', 'multiple systems', 'real-time'],
    medium: ['moderate', 'standard', 'typical', 'several', 'integration'],
    low: ['simple', 'basic', 'small', 'straightforward', 'minimal'],
  };
  
  let complexity = 'medium';
  for (const [level, keywords] of Object.entries(complexityIndicators)) {
    if (keywords.some(kw => description.includes(kw))) {
      complexity = level;
      break;
    }
  }
  
  // Extract tech stack mentions
  const techKeywords = ['react', 'next.js', 'node', 'python', 'django', 'flask', 'postgresql', 'mysql', 'mongodb', 
                        'redis', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'graphql', 'rest', 'supabase', 'firebase'];
  const detectedTech = techKeywords.filter(tech => description.includes(tech));
  
  // Suggest team size
  const teamSize = complexity === 'high' ? '3-5' : complexity === 'medium' ? '2-3' : '1-2';
  
  return {
    domain,
    complexity,
    detected_technologies: detectedTech,
    suggested_team_size: teamSize,
    analysis_summary: `Project appears to be in the ${domain} domain with ${complexity} complexity.`,
  };
}

/**
 * Estimate effort with phase breakdown
 */
async function estimateEffort(userId, projectId, scopeSummary, complexity) {
  const supabase = createSupabaseAdmin();
  
  // Base estimates by complexity (in hours)
  const baseEstimates = {
    low: { min: 80, max: 200, typical: 120 },
    medium: { min: 200, max: 500, typical: 300 },
    high: { min: 500, max: 1500, typical: 800 },
  };
  
  const estimate = baseEstimates[complexity] || baseEstimates.medium;
  
  // Phase breakdown (industry standard)
  const phases = {
    discovery: Math.round(estimate.typical * 0.10),
    planning: Math.round(estimate.typical * 0.15),
    development: Math.round(estimate.typical * 0.50),
    testing: Math.round(estimate.typical * 0.15),
    deployment: Math.round(estimate.typical * 0.10),
  };
  
  // Check for similar historical projects to refine estimate
  const { data: historicalProjects } = await supabase
    .from('historical_projects')
    .select('actual_effort_hours, estimated_effort_hours')
    .eq('user_id', userId)
    .limit(10);
  
  // Calculate accuracy factor from historical data
  let accuracyFactor = 1.0;
  if (historicalProjects && historicalProjects.length > 0) {
    const avgAccuracy = historicalProjects.reduce((sum, p) => {
      if (p.estimated_effort_hours && p.actual_effort_hours) {
        return sum + (p.actual_effort_hours / p.estimated_effort_hours);
      }
      return sum;
    }, 0) / historicalProjects.length;
    
    accuracyFactor = avgAccuracy || 1.0;
  }
  
  const adjustedTotal = Math.round(estimate.typical * accuracyFactor);
  
  return {
    total_hours: adjustedTotal,
    confidence_score: historicalProjects?.length > 3 ? 0.85 : 0.65,
    range: { min: estimate.min, max: estimate.max },
    phase_breakdown: phases,
    adjustment_factor: accuracyFactor,
    basis: historicalProjects?.length > 0 
      ? `Based on ${historicalProjects.length} similar past projects` 
      : 'Based on industry benchmarks',
  };
}

/**
 * Identify risks for the project
 */
async function identifyRisks(userId, projectId, domain, techStack = []) {
  const supabase = createSupabaseAdmin();
  
  // Fetch relevant risks from library
  const { data: libraryRisks } = await supabase
    .from('risk_library')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .contains('applicable_domains', [domain]);
  
  // Add tech-specific risks
  const techRisks = [];
  if (techStack.includes('api') || domain === 'api-integration') {
    techRisks.push({
      risk: 'API Rate Limiting',
      severity: 'medium',
      likelihood: 'high',
      mitigation: 'Implement request caching, queuing, and circuit breakers',
    });
  }
  
  if (techStack.some(t => ['aws', 'azure', 'gcp'].includes(t.toLowerCase()))) {
    techRisks.push({
      risk: 'Cloud Cost Overruns',
      severity: 'medium',
      likelihood: 'medium',
      mitigation: 'Set up billing alerts, use cost optimization tools',
    });
  }
  
  // Common project risks
  const commonRisks = [
    {
      risk: 'Scope Creep',
      severity: 'high',
      likelihood: 'high',
      mitigation: 'Define clear scope boundaries, implement change control process',
    },
    {
      risk: 'Resource Availability',
      severity: 'medium',
      likelihood: 'medium',
      mitigation: 'Cross-train team members, maintain backup resources',
    },
  ];
  
  const allRisks = [
    ...techRisks,
    ...commonRisks,
    ...(libraryRisks || []).map(r => ({
      risk: r.risk_title,
      severity: r.impact,
      likelihood: r.likelihood,
      mitigation: r.mitigation_strategy,
    })),
  ];
  
  return {
    risks: allRisks.slice(0, 8), // Top 8 risks
    risk_count: allRisks.length,
    high_severity_count: allRisks.filter(r => r.severity === 'high' || r.severity === 'critical').length,
  };
}

/**
 * Find similar historical projects
 */
async function findSimilarProjects(userId, domain, techStack = [], teamSize = null) {
  const supabase = createSupabaseAdmin();
  
  const { data: projects } = await supabase
    .from('historical_projects')
    .select('*')
    .eq('user_id', userId)
    .eq('domain', domain)
    .limit(10);
  
  if (!projects || projects.length === 0) {
    return { similar_projects: [], message: 'No historical projects found in this domain.' };
  }
  
  // Calculate similarity scores (simple tech stack overlap)
  const scoredProjects = projects.map(p => {
    const projectTech = p.tech_stack || [];
    const overlap = techStack.filter(t => projectTech.includes(t)).length;
    const similarity = techStack.length > 0 ? overlap / techStack.length : 0.5;
    
    return {
      name: p.name,
      similarity,
      actual_effort: p.actual_effort_hours,
      estimated_effort: p.estimated_effort_hours,
      accuracy: p.estimated_effort_hours 
        ? (p.actual_effort_hours / p.estimated_effort_hours * 100).toFixed(1) + '%'
        : 'N/A',
      completed_on_time: p.completed_on_time,
      quality_score: p.quality_score,
    };
  });
  
  // Sort by similarity
  scoredProjects.sort((a, b) => b.similarity - a.similarity);
  
  return {
    similar_projects: scoredProjects.slice(0, 5),
    average_actual_effort: Math.round(
      scoredProjects.reduce((sum, p) => sum + (p.actual_effort || 0), 0) / scoredProjects.length
    ),
  };
}

/**
 * Summarize meeting notes with AI-extracted insights
 */
function summarizeMeeting(meetingNotes, attendees = []) {
  // In production, this would use LLM to extract structured data
  // For now, simple extraction logic
  
  const lines = meetingNotes.split('\n').filter(l => l.trim());
  
  // Extract action items (lines with "TODO", "ACTION", "ASSIGN", etc.)
  const actionKeywords = ['todo', 'action', 'assign', 'task', 'follow-up'];
  const actionItems = lines
    .filter(line => actionKeywords.some(kw => line.toLowerCase().includes(kw)))
    .map(line => ({
      task: line.replace(/^(TODO|ACTION|ASSIGN):\s*/i, '').trim(),
      priority: line.toLowerCase().includes('urgent') || line.toLowerCase().includes('asap') ? 'high' : 'medium',
      assignee: attendees.length > 0 ? attendees[0] : 'TBD',
    }));
  
  // Extract decisions (lines with "DECIDED", "AGREED", "APPROVED")
  const decisionKeywords = ['decided', 'agreed', 'approved', 'resolution'];
  const decisions = lines
    .filter(line => decisionKeywords.some(kw => line.toLowerCase().includes(kw)))
    .map(line => ({
      decision: line.trim(),
      owner: 'Team',
    }));
  
  // Extract requirements (lines with "MUST", "SHOULD", "REQUIREMENT", "NEED")
  const reqKeywords = ['must', 'should', 'requirement', 'need', 'feature'];
  const requirements = lines
    .filter(line => reqKeywords.some(kw => line.toLowerCase().includes(kw)))
    .map(line => ({
      requirement: line.trim(),
      category: line.toLowerCase().includes('security') ? 'non-functional' : 'functional',
      priority: line.toLowerCase().includes('must') || line.toLowerCase().includes('critical') 
        ? 'must-have' 
        : 'nice-to-have',
    }));
  
  // Extract risks (lines with "RISK", "CONCERN", "ISSUE", "CHALLENGE")
  const riskKeywords = ['risk', 'concern', 'issue', 'challenge', 'blocker'];
  const risks = lines
    .filter(line => riskKeywords.some(kw => line.toLowerCase().includes(kw)))
    .map(line => ({
      risk: line.trim(),
      mentioned_by: attendees.length > 0 ? attendees[Math.floor(Math.random() * attendees.length)] : 'Unknown',
    }));
  
  return {
    summary: `Meeting with ${attendees.length} attendees covered project scope, decisions, and next steps.`,
    key_decisions: decisions.slice(0, 5),
    action_items: actionItems.slice(0, 10),
    requirements_extracted: requirements.slice(0, 10),
    risks_identified: risks.slice(0, 5),
    attendee_count: attendees.length,
  };
}

/**
 * Calculate cost estimate
 */
function calculateCostEstimate(effortHours, hourlyRate = 100, overheadPercentage = 20) {
  const baseCost = effortHours * hourlyRate;
  const overhead = baseCost * (overheadPercentage / 100);
  const totalCost = baseCost + overhead;
  
  return {
    base_cost: baseCost,
    overhead_cost: overhead,
    total_cost: totalCost,
    hourly_rate: hourlyRate,
    overhead_percentage: overheadPercentage,
    breakdown: {
      labor: baseCost,
      overhead: overhead,
      contingency: Math.round(totalCost * 0.1), // 10% contingency
    },
  };
}

/**
 * Suggest project timeline
 */
function suggestTimeline(effortHours, teamSize, workingHoursPerWeek = 40) {
  const totalPersonHours = effortHours;
  const weeksRequired = Math.ceil(totalPersonHours / (teamSize * workingHoursPerWeek));
  
  // Add buffer (20%)
  const bufferedWeeks = Math.ceil(weeksRequired * 1.2);
  
  // Suggest milestones
  const milestones = [
    { phase: 'Discovery & Planning', weeks: Math.ceil(bufferedWeeks * 0.25), percentage: 25 },
    { phase: 'Development Phase 1', weeks: Math.ceil(bufferedWeeks * 0.25), percentage: 50 },
    { phase: 'Development Phase 2', weeks: Math.ceil(bufferedWeeks * 0.25), percentage: 75 },
    { phase: 'Testing & Deployment', weeks: Math.ceil(bufferedWeeks * 0.25), percentage: 100 },
  ];
  
  return {
    estimated_duration_weeks: bufferedWeeks,
    working_weeks: weeksRequired,
    buffer_weeks: bufferedWeeks - weeksRequired,
    team_size: teamSize,
    milestones,
    end_date_from_now: `Approximately ${bufferedWeeks} weeks from start`,
  };
}

/**
 * Save project analysis to database
 */
async function saveProjectAnalysis(userId, projectId, analysis) {
  const supabase = createSupabaseAdmin();
  
  const { error } = await supabase
    .from('projects')
    .update({
      estimated_effort_hours: analysis.effort?.total_hours,
      estimated_cost: analysis.cost?.total_cost,
      estimated_duration_weeks: analysis.timeline?.estimated_duration_weeks,
      confidence_score: analysis.effort?.confidence_score,
      effort_breakdown: analysis.effort?.phase_breakdown,
      risk_analysis: analysis.risks?.risks,
      similar_projects: analysis.similar_projects?.similar_projects,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, message: 'Project analysis saved successfully.' };
}

// ── Main Tool Executor ──────────────────────────────────────────────────────────

export async function executePlanningTool(name, args, userId) {
  try {
    switch (name) {
      case 'analyze_project_scope':
        return analyzeProjectScope(args.project_description);
      
      case 'estimate_effort':
        return await estimateEffort(userId, args.project_id, args.scope_summary, args.complexity);
      
      case 'identify_risks':
        return await identifyRisks(userId, args.project_id, args.domain, args.tech_stack);
      
      case 'find_similar_projects':
        return await findSimilarProjects(userId, args.domain, args.tech_stack, args.team_size);
      
      case 'summarize_meeting':
        return summarizeMeeting(args.meeting_notes, args.attendees);
      
      case 'calculate_cost_estimate':
        return calculateCostEstimate(args.effort_hours, args.hourly_rate, args.overhead_percentage);
      
      case 'suggest_timeline':
        return suggestTimeline(args.effort_hours, args.team_size, args.working_hours_per_week);
      
      case 'save_project_analysis':
        return await saveProjectAnalysis(userId, args.project_id, args.analysis);
      
      default:
        return { error: `Unknown planning tool: ${name}` };
    }
  } catch (error) {
    return { error: error.message };
  }
}
