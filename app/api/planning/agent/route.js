import { auth } from '@clerk/nextjs/server';
import { PLANNING_TOOL_DEFS, executePlanningTool } from '@/lib/planningTools';

/**
 * Planning Agent Route - AI-powered project planning and discovery
 * Similar to the data cleaning agent but focused on project estimation and risk analysis
 */

function buildPlanningSystemPrompt() {
  return `You are an expert project planning and discovery assistant with deep knowledge of software development, project management, and risk analysis.

Your role is to help users:
1. **Analyze project scope** - Extract key details from requirements and descriptions
2. **Estimate effort and cost** - Provide realistic estimates based on complexity and historical data
3. **Identify risks** - Spot potential issues and suggest mitigation strategies
4. **Summarize meetings** - Extract key decisions, action items, and requirements from meeting notes
5. **Learn from history** - Use past project data to improve estimation accuracy

**Core principles:**
- Always break down estimates into phases (discovery, planning, development, testing, deployment)
- Identify risks early with specific, actionable mitigation strategies
- Base estimates on similar historical projects when available
- Be realistic about uncertainties - provide confidence scores and ranges
- Extract structured insights from unstructured meeting notes
- Think in terms of: What could go wrong? What similar work have we done? What's the critical path?

**Available tools:**
- analyze_project_scope: Extract domain, complexity, tech stack from descriptions
- estimate_effort: Calculate time estimates with phase breakdown
- identify_risks: Find potential risks with severity and mitigation
- find_similar_projects: Search historical data for comparable projects
- summarize_meeting: Extract decisions, action items, and requirements from meeting notes
- calculate_cost_estimate: Convert effort to cost estimates
- suggest_timeline: Create milestone-based timelines
- save_project_analysis: Persist complete analysis to database

When a user describes a project or shares meeting notes, use these tools to provide comprehensive planning insights. Always explain your reasoning and the basis for your estimates.`;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { message, history = [], projectId, model } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'GROQ_API_KEY is not set. Add it to .env.local and restart.' },
        { status: 500 }
      );
    }

    const toolLog = [];
    const messages = [
      { role: 'system', content: buildPlanningSystemPrompt() },
      ...history,
      { role: 'user', content: message },
    ];

    let finalReply = '';
    let analysis = {};

    // Agent loop (up to 10 iterations for complex planning tasks)
    for (let i = 0; i < 10; i++) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'openai/gpt-oss-120b',
          max_tokens: 2000,
          messages,
          tools: PLANNING_TOOL_DEFS,
          tool_choice: 'auto',
        }),
      });

      const data = await groqRes.json();
      
      if (!groqRes.ok) {
        return Response.json(
          { error: data?.error?.message || 'Groq API error.' },
          { status: groqRes.status }
        );
      }

      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      // If model wants to call tools
      if (choice.tool_calls?.length) {
        messages.push(choice);
        
        for (const call of choice.tool_calls) {
          let args = {};
          try {
            args = JSON.parse(call.function.arguments || '{}');
          } catch {
            args = {};
          }

          // Execute the planning tool
          const result = await executePlanningTool(call.function.name, args, userId);
          
          toolLog.push({
            tool: call.function.name,
            args,
            result,
          });

          // Store results in analysis object for final response
          if (call.function.name === 'estimate_effort') {
            analysis.effort = result;
          } else if (call.function.name === 'identify_risks') {
            analysis.risks = result;
          } else if (call.function.name === 'calculate_cost_estimate') {
            analysis.cost = result;
          } else if (call.function.name === 'suggest_timeline') {
            analysis.timeline = result;
          } else if (call.function.name === 'find_similar_projects') {
            analysis.similar_projects = result;
          } else if (call.function.name === 'analyze_project_scope') {
            analysis.scope = result;
          } else if (call.function.name === 'summarize_meeting') {
            analysis.meeting_summary = result;
          }

          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      // Model returned a text response - we're done
      finalReply = choice.content || '';
      break;
    }

    return Response.json({
      reply: finalReply || 'Analysis complete. Check the results below.',
      toolLog,
      analysis,
      projectId,
    });
  } catch (err) {
    console.error('Planning agent error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
