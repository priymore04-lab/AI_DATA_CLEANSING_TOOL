-- ═══════════════════════════════════════════════════════════════════════════════
-- Planning & Discovery Module Schema
-- Run this in Supabase SQL Editor after supabase-setup.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- Projects table: Store project metadata and estimates
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'discovery', -- discovery, planning, in-progress, completed, on-hold
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI-generated estimates
  estimated_effort_hours NUMERIC,
  estimated_cost NUMERIC,
  estimated_duration_weeks NUMERIC,
  confidence_score NUMERIC, -- 0.0 to 1.0
  
  -- Project metadata
  domain TEXT, -- e.g., 'data-cleansing', 'web-app', 'api-integration'
  tech_stack JSONB, -- ['Next.js', 'React', 'Supabase']
  team_size INTEGER,
  
  -- Analysis results
  effort_breakdown JSONB, -- {planning: 40, development: 200, testing: 60, deployment: 20}
  risk_analysis JSONB, -- [{risk: 'API rate limits', severity: 'high', mitigation: '...'}]
  similar_projects JSONB -- [{name: '...', similarity: 0.85, actual_effort: 300}]
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

-- Meeting notes table: Store and analyze stakeholder discussions
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  attendees TEXT[], -- ['John Doe', 'Jane Smith']
  raw_notes TEXT NOT NULL, -- Original meeting transcript/notes
  
  -- AI-generated summaries
  summary TEXT, -- Executive summary
  key_decisions JSONB, -- [{decision: '...', owner: '...', deadline: '...'}]
  action_items JSONB, -- [{task: '...', assignee: '...', priority: 'high'}]
  requirements_extracted JSONB, -- [{requirement: '...', category: 'functional', priority: 'must-have'}]
  risks_identified JSONB, -- [{risk: '...', mentioned_by: '...'}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_user ON meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project ON meeting_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_date ON meeting_notes(date DESC);

-- Historical projects table: Learn from past projects (for ML/similarity matching)
CREATE TABLE IF NOT EXISTS historical_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  tech_stack JSONB,
  team_size INTEGER,
  
  -- Actual vs Estimated metrics
  estimated_effort_hours NUMERIC,
  actual_effort_hours NUMERIC,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  estimated_duration_weeks NUMERIC,
  actual_duration_weeks NUMERIC,
  
  -- Success metrics
  completed_on_time BOOLEAN,
  completed_on_budget BOOLEAN,
  quality_score NUMERIC, -- 1-10
  
  -- Lessons learned
  challenges_faced JSONB, -- [{challenge: '...', impact: 'high', solution: '...'}]
  success_factors JSONB, -- ['Good communication', 'Clear requirements']
  recommendations JSONB, -- ['Add buffer time', 'Use feature flags']
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historical_projects_user ON historical_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_historical_projects_domain ON historical_projects(domain);

-- Risk library: Common risks and mitigation strategies
CREATE TABLE IF NOT EXISTS risk_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- NULL = global/shared risks, TEXT = user-specific
  risk_category TEXT, -- 'technical', 'resource', 'schedule', 'cost', 'external'
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  likelihood TEXT, -- 'low', 'medium', 'high'
  impact TEXT, -- 'low', 'medium', 'high', 'critical'
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  
  -- Metadata
  applicable_domains TEXT[], -- ['web-development', 'api-integration']
  tags TEXT[], -- ['api', 'rate-limiting', 'third-party']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_library_category ON risk_library(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_library_user ON risk_library(user_id);

-- Templates for common project types
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- NULL = global templates
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  
  -- Template data
  typical_effort_hours NUMERIC,
  typical_duration_weeks NUMERIC,
  typical_team_size INTEGER,
  common_tech_stack JSONB,
  phase_breakdown JSONB, -- {discovery: 10%, planning: 15%, development: 50%, testing: 15%, deployment: 10%}
  common_risks JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_templates_domain ON project_templates(domain);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_notes_updated_at BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_library_updated_at BEFORE UPDATE ON risk_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Sample Data (Optional - for testing)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert some common risk templates
INSERT INTO risk_library (risk_category, risk_title, risk_description, likelihood, impact, mitigation_strategy, applicable_domains, tags) VALUES
('technical', 'API Rate Limiting', 'Third-party API may have rate limits that affect application performance', 'high', 'medium', 'Implement caching, request queuing, and fallback mechanisms', ARRAY['api-integration', 'web-development'], ARRAY['api', 'rate-limiting', 'third-party']),
('technical', 'Data Security Breach', 'Sensitive user data could be exposed due to security vulnerabilities', 'medium', 'critical', 'Implement encryption, regular security audits, penetration testing, and compliance checks', ARRAY['web-development', 'data-processing'], ARRAY['security', 'compliance', 'data']),
('resource', 'Key Team Member Unavailability', 'Critical team member may become unavailable during project', 'medium', 'high', 'Cross-train team members, document knowledge, maintain backup resources', ARRAY['all'], ARRAY['resource', 'team', 'knowledge-transfer']),
('schedule', 'Scope Creep', 'Project scope may expand without corresponding timeline adjustments', 'high', 'high', 'Define clear scope boundaries, implement change control process, regular stakeholder alignment', ARRAY['all'], ARRAY['scope', 'project-management']),
('cost', 'Cloud Infrastructure Costs', 'Cloud service costs may exceed budget as usage scales', 'medium', 'medium', 'Set up cost monitoring alerts, implement auto-scaling policies, optimize resource usage', ARRAY['web-development', 'api-integration'], ARRAY['cloud', 'cost', 'infrastructure']),
('external', 'Third-Party Service Downtime', 'External dependencies may experience outages', 'medium', 'high', 'Implement circuit breakers, fallback mechanisms, and status monitoring', ARRAY['api-integration'], ARRAY['third-party', 'reliability', 'availability']);

-- Insert project templates
INSERT INTO project_templates (name, description, domain, typical_effort_hours, typical_duration_weeks, typical_team_size, common_tech_stack, phase_breakdown, common_risks) VALUES
('Simple Web Application', 'Basic CRUD web application with authentication', 'web-development', 200, 6, 2, 
  '["Next.js", "React", "PostgreSQL", "Authentication"]'::jsonb,
  '{"discovery": 10, "planning": 10, "development": 50, "testing": 20, "deployment": 10}'::jsonb,
  '["Scope creep", "Third-party service integration", "Performance optimization"]'::jsonb),
('API Integration Project', 'Integrate with multiple third-party APIs', 'api-integration', 150, 5, 2,
  '["Node.js", "REST APIs", "Database", "Queue System"]'::jsonb,
  '{"discovery": 15, "planning": 15, "development": 40, "testing": 20, "deployment": 10}'::jsonb,
  '["API rate limiting", "Third-party service downtime", "Data synchronization issues"]'::jsonb),
('Data Processing Pipeline', 'ETL pipeline for data cleansing and transformation', 'data-processing', 300, 8, 3,
  '["Python", "Pandas", "Database", "Cloud Storage", "Scheduling"]'::jsonb,
  '{"discovery": 10, "planning": 15, "development": 45, "testing": 20, "deployment": 10}'::jsonb,
  '["Large data volumes", "Data quality issues", "Performance bottlenecks"]'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Notes:
-- - Access control is handled in API routes via user_id filtering (same as main app)
-- - No Row-Level Security (RLS) is enabled (consistent with existing architecture)
-- - All queries should filter by user_id in the application layer
-- ═══════════════════════════════════════════════════════════════════════════════
