# Planning & Discovery Module

## Overview

The Planning & Discovery module adds AI-powered project planning, estimation, and risk analysis capabilities to DataCleanseAI. It helps teams make better decisions early in the project lifecycle.

## Features

### 1. **AI-Powered Project Analysis**
- Analyze project descriptions to extract domain, complexity, and tech stack
- Get realistic effort estimates broken down by phase
- Identify potential risks with severity ratings and mitigation strategies
- Find similar historical projects for better estimation accuracy

### 2. **Meeting Summarization**
- Upload meeting notes or transcripts
- AI extracts:
  - Executive summary
  - Key decisions and owners
  - Action items with assignees
  - Requirements (functional & non-functional)
  - Identified risks and concerns

### 3. **Cost & Timeline Estimation**
- Convert effort estimates to cost (customizable hourly rates)
- Generate milestone-based timelines
- Account for team size and working hours
- Include buffer time and contingency planning

### 4. **Historical Learning**
- Store completed projects with actual vs estimated metrics
- System learns from past accuracy and adjusts future estimates
- Build organizational knowledge base of risks and solutions

## Database Schema

### Tables

#### `projects`
Stores project metadata and AI-generated estimates.

```sql
- id: UUID (primary key)
- user_id: TEXT
- name: TEXT
- description: TEXT
- status: TEXT (discovery, planning, in-progress, completed, on-hold)
- estimated_effort_hours: NUMERIC
- estimated_cost: NUMERIC
- estimated_duration_weeks: NUMERIC
- confidence_score: NUMERIC (0-1)
- domain: TEXT
- tech_stack: JSONB
- team_size: INTEGER
- effort_breakdown: JSONB
- risk_analysis: JSONB
- similar_projects: JSONB
```

#### `meeting_notes`
Stores meeting notes with AI-extracted insights.

```sql
- id: UUID
- user_id: TEXT
- project_id: UUID (foreign key to projects)
- title: TEXT
- date: TIMESTAMPTZ
- attendees: TEXT[]
- raw_notes: TEXT
- summary: TEXT
- key_decisions: JSONB
- action_items: JSONB
- requirements_extracted: JSONB
- risks_identified: JSONB
```

#### `historical_projects`
Tracks completed projects for learning and pattern matching.

```sql
- id: UUID
- user_id: TEXT
- name: TEXT
- domain: TEXT
- tech_stack: JSONB
- team_size: INTEGER
- estimated_effort_hours: NUMERIC
- actual_effort_hours: NUMERIC
- estimated_cost: NUMERIC
- actual_cost: NUMERIC
- completed_on_time: BOOLEAN
- quality_score: NUMERIC
- challenges_faced: JSONB
- success_factors: JSONB
```

#### `risk_library`
Reusable risk templates with mitigation strategies.

```sql
- id: UUID
- user_id: TEXT (NULL = global)
- risk_category: TEXT
- risk_title: TEXT
- risk_description: TEXT
- likelihood: TEXT
- impact: TEXT
- mitigation_strategy: TEXT
- applicable_domains: TEXT[]
- tags: TEXT[]
```

## API Routes

### Planning Agent
**POST** `/api/planning/agent`

AI agent that orchestrates multiple planning tools.

**Request:**
```json
{
  "message": "I want to build a web app for data cleaning with AI",
  "history": [],
  "projectId": "uuid-here",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:**
```json
{
  "reply": "Based on your requirements, I've analyzed the project...",
  "toolLog": [
    {"tool": "analyze_project_scope", "args": {...}, "result": {...}},
    {"tool": "estimate_effort", "args": {...}, "result": {...}}
  ],
  "analysis": {
    "scope": {...},
    "effort": {...},
    "risks": {...},
    "cost": {...},
    "timeline": {...}
  }
}
```

### Projects CRUD
**GET** `/api/planning/projects` - List all projects  
**POST** `/api/planning/projects` - Create new project  
**GET** `/api/planning/projects/[id]` - Get specific project  
**PATCH** `/api/planning/projects/[id]` - Update project  
**DELETE** `/api/planning/projects/[id]` - Delete project

### Meeting Notes CRUD
**GET** `/api/planning/meetings?project_id=uuid` - List meetings  
**POST** `/api/planning/meetings` - Create meeting notes

## Planning Tools

The AI agent has access to these tools:

### 1. `analyze_project_scope`
Extracts domain, complexity, and tech stack from project description.

### 2. `estimate_effort`
Calculates effort estimate with phase breakdown:
- Discovery (10%)
- Planning (15%)
- Development (50%)
- Testing (15%)
- Deployment (10%)

### 3. `identify_risks`
Identifies risks from:
- Risk library
- Domain-specific risks
- Tech stack risks
- Common project risks

### 4. `find_similar_projects`
Searches historical projects and calculates similarity scores.

### 5. `summarize_meeting`
Extracts structured data from meeting notes:
- Action items
- Decisions
- Requirements
- Risks

### 6. `calculate_cost_estimate`
Converts effort to cost with overhead and contingency.

### 7. `suggest_timeline`
Creates milestone-based timeline with buffer.

### 8. `save_project_analysis`
Persists complete analysis to database.

## Usage Examples

### Example 1: Estimate a New Project

```javascript
const response = await fetch('/api/planning/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Analyze this project: 
    
    Build a customer management dashboard with authentication, 
    CSV import/export, real-time notifications, and role-based access. 
    Using Next.js, Supabase, and Clerk. Team of 2 developers.`,
    projectId: 'project-uuid',
  }),
});

const data = await response.json();
console.log(data.analysis);
// {
//   scope: { domain: 'web-development', complexity: 'medium', ... },
//   effort: { total_hours: 300, phase_breakdown: {...}, confidence_score: 0.85 },
//   risks: { risks: [...], high_severity_count: 2 },
//   cost: { total_cost: 36000, ... },
//   timeline: { estimated_duration_weeks: 8, milestones: [...] }
// }
```

### Example 2: Summarize a Meeting

```javascript
const meetingNotes = `
MEETING: Project Kickoff
DATE: 2024-01-15
ATTENDEES: John, Sarah, Mike

AGENDA:
- Discuss project scope
- Identify technical requirements
- Set milestones

NOTES:
- DECIDED: Use Next.js for frontend and Supabase for backend
- REQUIREMENT: Must support CSV files up to 100MB
- REQUIREMENT: User authentication via OAuth
- TODO: Sarah to create database schema by Jan 20
- TODO: Mike to set up dev environment by Jan 18
- RISK: API rate limiting could be an issue with Groq
- AGREED: Start with MVP features only, add advanced features in phase 2
`;

const response = await fetch('/api/planning/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Summarize this meeting: ${meetingNotes}`,
    projectId: 'project-uuid',
  }),
});

const data = await response.json();
console.log(data.analysis.meeting_summary);
// {
//   summary: "Meeting covered project scope, tech decisions, and next steps...",
//   key_decisions: [{decision: "Use Next.js for frontend...", owner: "Team"}],
//   action_items: [
//     {task: "Create database schema", assignee: "Sarah", priority: "medium"},
//     {task: "Set up dev environment", assignee: "Mike", priority: "medium"}
//   ],
//   requirements_extracted: [
//     {requirement: "Support CSV files up to 100MB", category: "functional"},
//     {requirement: "User authentication via OAuth", category: "functional"}
//   ],
//   risks_identified: [
//     {risk: "API rate limiting could be an issue", mentioned_by: "Team"}
//   ]
// }
```

### Example 3: Learn from Historical Data

```javascript
// Add a completed project to historical data
const { data } = await supabase
  .from('historical_projects')
  .insert({
    user_id: userId,
    name: 'Customer Portal v1',
    domain: 'web-development',
    tech_stack: ['Next.js', 'Supabase', 'Clerk'],
    team_size: 2,
    estimated_effort_hours: 250,
    actual_effort_hours: 320,
    estimated_duration_weeks: 6,
    actual_duration_weeks: 8,
    completed_on_time: false,
    quality_score: 8,
    challenges_faced: [
      {
        challenge: 'Third-party API integration took longer than expected',
        impact: 'high',
        solution: 'Added abstraction layer and mock services for testing'
      }
    ],
    success_factors: [
      'Daily standups kept team aligned',
      'Early user feedback improved UX'
    ],
  });

// Future estimates will now factor in this historical accuracy
```

## Integration with Main App

To add the Planning tab to the main DataCleanseAI UI:

1. Add to `TABS` array in `app/page.js`:
```javascript
const TABS = [...existing, 'planning'];
const TAB_LABELS = {...existing, planning: 'Planning'};
```

2. Add the Planning tab component (see `PLANNING_UI_COMPONENT.md`)

3. Update navigation labels

## Estimation Accuracy

The system tracks estimation accuracy over time:

```
Initial estimates: Based on industry benchmarks (confidence: 0.65)
After 3-5 projects: Adjusted by user's historical accuracy (confidence: 0.85)
After 10+ projects: Personalized ML-based estimates (confidence: 0.92)
```

## Risk Categories

- **Technical**: API limits, security, performance, scalability
- **Resource**: Team availability, skill gaps, dependencies
- **Schedule**: Scope creep, timeline pressure, milestone slippage
- **Cost**: Budget overruns, cloud costs, licensing
- **External**: Third-party downtime, regulatory changes, market shifts

## Best Practices

1. **Start with Scope Analysis**: Let AI analyze your project description first
2. **Add Historical Data**: Input completed projects for better accuracy
3. **Review Risks Early**: Address high-severity risks in planning phase
4. **Document Meetings**: Use AI summarization to extract action items
5. **Track Actuals**: Compare estimates vs actuals to improve future predictions
6. **Build Risk Library**: Save common risks and solutions for reuse

## Future Enhancements

- Integration with project management tools (Jira, Asana)
- Automated risk monitoring during project execution
- ML-based similarity matching for historical projects
- Real-time collaboration features
- Budget tracking and burn-rate analysis
- Custom estimation models per domain

## Setup Instructions

1. Run `planning-setup.sql` in Supabase SQL Editor
2. Verify tables created successfully
3. (Optional) Seed sample risk library data
4. Add Planning UI component to main app
5. Test with sample project descriptions

---

**Note**: This module extends DataCleanseAI's capabilities from data cleaning to comprehensive project planning, creating a more complete AI-powered workflow tool.
