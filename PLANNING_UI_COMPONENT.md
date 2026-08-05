/* 
 * PLANNING UI COMPONENT - Add this to app/page.js
 * 
 * This is the UI for the Planning & Discovery module.
 * Add 'planning' to TABS array and integrate this component.
 */

// ========== State Variables to Add ==========
// Add these to your existing useState declarations in app/page.js

const [planningProjects, setPlanningProjects] = useState([]);
const [selectedProject, setSelectedProject] = useState(null);
const [planningMessages, setPlanningMessages] = useState([]);
const [planningInput, setPlanningInput] = useState('');
const [planningLoading, setPlanningLoading] = useState(false);
const [projectAnalysis, setProjectAnalysis] = useState(null);
const [meetings, setMeetings] = useState([]);
const [showNewProjectModal, setShowNewProjectModal] = useState(false);

// ========== Helper Functions to Add ==========

async function loadPlanningProjects() {
  try {
    const res = await fetch('/api/planning/projects');
    const data = await res.json();
    if (data.projects) {
      setPlanningProjects(data.projects);
    }
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

async function createProject(name, description, domain) {
  try {
    const res = await fetch('/api/planning/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, domain }),
    });
    const data = await res.json();
    if (data.project) {
      setPlanningProjects([data.project, ...planningProjects]);
      setSelectedProject(data.project);
      setShowNewProjectModal(false);
      return data.project;
    }
  } catch (err) {
    console.error('Failed to create project:', err);
  }
}

async function loadMeetings(projectId) {
  try {
    const res = await fetch(`/api/planning/meetings?project_id=${projectId}`);
    const data = await res.json();
    if (data.meetings) {
      setMeetings(data.meetings);
    }
  } catch (err) {
    console.error('Failed to load meetings:', err);
  }
}

async function sendPlanningMessage() {
  if (!planningInput.trim()) return;
  
  const userMsg = { role: 'user', content: planningInput };
  setPlanningMessages([...planningMessages, userMsg]);
  setPlanningInput('');
  setPlanningLoading(true);

  try {
    const res = await fetch('/api/planning/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: planningInput,
        history: planningMessages,
        projectId: selectedProject?.id,
        model: groqModel,
      }),
    });

    const data = await res.json();
    
    if (data.error) {
      setPlanningMessages([
        ...planningMessages,
        userMsg,
        { role: 'assistant', content: `Error: ${data.error}` },
      ]);
    } else {
      setPlanningMessages([
        ...planningMessages,
        userMsg,
        { role: 'assistant', content: data.reply, analysis: data.analysis, toolLog: data.toolLog },
      ]);
      
      // Store analysis if it exists
      if (data.analysis) {
        setProjectAnalysis(data.analysis);
      }
    }
  } catch (err) {
    setPlanningMessages([
      ...planningMessages,
      userMsg,
      { role: 'assistant', content: `Network error: ${err.message}` },
    ]);
  } finally {
    setPlanningLoading(false);
  }
}

// ========== Add to useEffect on mount ==========
// Add this to your existing useEffect:
// loadPlanningProjects();

// ========== UI Component - Add to TAB rendering section ==========

{activeTab === 'planning' && (
  <div className="planning-container">
    <div className="planning-header">
      <h2>📊 Project Planning & Discovery</h2>
      <p className="subtitle">AI-powered project estimation, risk analysis, and meeting summarization</p>
    </div>

    <div className="planning-layout">
      {/* Left Sidebar - Projects List */}
      <div className="planning-sidebar">
        <div className="sidebar-header">
          <h3>Projects</h3>
          <button className="btn-p" onClick={() => setShowNewProjectModal(true)}>
            + New
          </button>
        </div>

        <div className="projects-list">
          {planningProjects.length === 0 && (
            <div className="empty-state">
              <p>No projects yet</p>
              <small>Create a project to start planning</small>
            </div>
          )}

          {planningProjects.map(project => (
            <div
              key={project.id}
              className={`project-card ${selectedProject?.id === project.id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedProject(project);
                setPlanningMessages([]);
                setProjectAnalysis(null);
                loadMeetings(project.id);
              }}
            >
              <div className="project-status">{project.status}</div>
              <h4>{project.name}</h4>
              {project.domain && <span className="project-domain">{project.domain}</span>}
              {project.estimated_effort_hours && (
                <div className="project-estimate">
                  ~{project.estimated_effort_hours}h • ${(project.estimated_cost || 0).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="planning-main">
        {!selectedProject ? (
          <div className="planning-welcome">
            <h3>👋 Welcome to Project Planning</h3>
            <p>Select a project or create a new one to start planning with AI.</p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">⏱️</div>
                <h4>Effort Estimation</h4>
                <p>Get realistic time estimates broken down by phase</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚠️</div>
                <h4>Risk Analysis</h4>
                <p>Identify potential issues early with mitigation strategies</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📝</div>
                <h4>Meeting Summaries</h4>
                <p>Extract action items and decisions from meeting notes</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h4>Cost Estimates</h4>
                <p>Convert effort to budget with overhead and contingency</p>
              </div>
            </div>

            <button className="btn-p btn-lg" onClick={() => setShowNewProjectModal(true)}>
              Create Your First Project
            </button>
          </div>
        ) : (
          <>
            {/* Project Header */}
            <div className="project-header">
              <div>
                <h2>{selectedProject.name}</h2>
                {selectedProject.description && <p>{selectedProject.description}</p>}
              </div>
              <div className="project-meta">
                <span className={`status-badge status-${selectedProject.status}`}>
                  {selectedProject.status}
                </span>
              </div>
            </div>

            {/* Analysis Summary Cards */}
            {projectAnalysis && (
              <div className="analysis-summary">
                {projectAnalysis.effort && (
                  <div className="summary-card">
                    <h4>⏱️ Effort Estimate</h4>
                    <div className="summary-value">{projectAnalysis.effort.total_hours}h</div>
                    <div className="summary-detail">
                      Confidence: {(projectAnalysis.effort.confidence_score * 100).toFixed(0)}%
                    </div>
                  </div>
                )}

                {projectAnalysis.cost && (
                  <div className="summary-card">
                    <h4>💰 Cost Estimate</h4>
                    <div className="summary-value">${projectAnalysis.cost.total_cost.toLocaleString()}</div>
                    <div className="summary-detail">
                      Including {projectAnalysis.cost.overhead_percentage}% overhead
                    </div>
                  </div>
                )}

                {projectAnalysis.timeline && (
                  <div className="summary-card">
                    <h4>📅 Timeline</h4>
                    <div className="summary-value">{projectAnalysis.timeline.estimated_duration_weeks} weeks</div>
                    <div className="summary-detail">
                      With {projectAnalysis.timeline.buffer_weeks} weeks buffer
                    </div>
                  </div>
                )}

                {projectAnalysis.risks && (
                  <div className="summary-card alert">
                    <h4>⚠️ Risks</h4>
                    <div className="summary-value">{projectAnalysis.risks.risks.length}</div>
                    <div className="summary-detail">
                      {projectAnalysis.risks.high_severity_count} high severity
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Interface */}
            <div className="planning-chat">
              <div className="chat-messages">
                {planningMessages.length === 0 && (
                  <div className="chat-welcome">
                    <h4>🤖 AI Planning Assistant</h4>
                    <p>Ask me to:</p>
                    <ul>
                      <li>"Analyze the scope of this project"</li>
                      <li>"Estimate effort and cost for building a dashboard"</li>
                      <li>"What are the main risks for this project?"</li>
                      <li>"Summarize this meeting: [paste notes]"</li>
                      <li>"Find similar projects we've done before"</li>
                    </ul>
                  </div>
                )}

                {planningMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role}`}>
                    <div className="message-content">
                      {msg.content}
                    </div>

                    {msg.analysis && (
                      <div className="message-analysis">
                        {/* Render detailed analysis */}
                        {msg.analysis.effort && (
                          <details className="analysis-section">
                            <summary>📊 Effort Breakdown</summary>
                            <div className="analysis-content">
                              <table className="tbl">
                                <thead>
                                  <tr>
                                    <th>Phase</th>
                                    <th>Hours</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(msg.analysis.effort.phase_breakdown || {}).map(([phase, hours]) => (
                                    <tr key={phase}>
                                      <td>{phase}</td>
                                      <td>{hours}h</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        )}

                        {msg.analysis.risks && msg.analysis.risks.risks && (
                          <details className="analysis-section">
                            <summary>⚠️ Risk Analysis</summary>
                            <div className="analysis-content">
                              {msg.analysis.risks.risks.map((risk, i) => (
                                <div key={i} className="risk-item">
                                  <div className="risk-header">
                                    <strong>{risk.risk}</strong>
                                    <span className={`badge badge-${risk.severity}`}>{risk.severity}</span>
                                  </div>
                                  <div className="risk-mitigation">
                                    <em>Mitigation:</em> {risk.mitigation}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {msg.analysis.meeting_summary && (
                          <details className="analysis-section" open>
                            <summary>📝 Meeting Summary</summary>
                            <div className="analysis-content">
                              <p><strong>Summary:</strong> {msg.analysis.meeting_summary.summary}</p>
                              
                              {msg.analysis.meeting_summary.action_items?.length > 0 && (
                                <>
                                  <h5>Action Items:</h5>
                                  <ul>
                                    {msg.analysis.meeting_summary.action_items.map((item, i) => (
                                      <li key={i}>
                                        {item.task} <em>({item.assignee})</em>
                                        <span className={`badge badge-${item.priority}`}>{item.priority}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {msg.toolLog && msg.toolLog.length > 0 && (
                      <details className="tool-log">
                        <summary>🔧 Tools Used ({msg.toolLog.length})</summary>
                        <div className="tool-log-content">
                          {msg.toolLog.map((log, i) => (
                            <div key={i} className="tool-entry">
                              <code>{log.tool}</code>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}

                {planningLoading && (
                  <div className="chat-message assistant loading">
                    <div className="message-content">Analyzing...</div>
                  </div>
                )}
              </div>

              <div className="chat-input">
                <textarea
                  value={planningInput}
                  onChange={e => setPlanningInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendPlanningMessage();
                    }
                  }}
                  placeholder="Ask the AI to analyze scope, estimate effort, identify risks, or summarize meeting notes..."
                  rows={3}
                  disabled={planningLoading}
                />
                <button
                  className="btn-p"
                  onClick={sendPlanningMessage}
                  disabled={planningLoading || !planningInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* New Project Modal */}
    {showNewProjectModal && (
      <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h3>Create New Project</h3>
          <form
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createProject(
                formData.get('name'),
                formData.get('description'),
                formData.get('domain')
              );
            }}
          >
            <label>
              Project Name *
              <input type="text" name="name" required />
            </label>
            
            <label>
              Description
              <textarea name="description" rows={3} />
            </label>
            
            <label>
              Domain
              <select name="domain">
                <option value="">Select domain...</option>
                <option value="web-development">Web Development</option>
                <option value="api-integration">API Integration</option>
                <option value="data-processing">Data Processing</option>
                <option value="mobile-development">Mobile Development</option>
                <option value="other">Other</option>
              </select>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn-d" onClick={() => setShowNewProjectModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-p">
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)}

// ========== CSS Styles to Add to globals.css ==========

/*
.planning-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.planning-header {
  padding: 1rem;
  border-bottom: 1px solid var(--bord);
}

.planning-header .subtitle {
  color: var(--fg2);
  margin-top: 0.5rem;
}

.planning-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  flex: 1;
  overflow: hidden;
}

.planning-sidebar {
  border-right: 1px solid var(--bord);
  display: flex;
  flex-direction: column;
  background: var(--surf);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--bord);
}

.projects-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.project-card {
  padding: 1rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--bord);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  background: var(--bg);
  border-color: var(--grn);
}

.project-card.selected {
  background: var(--grn);
  color: white;
  border-color: var(--grn);
}

.project-status {
  font-size: 0.75rem;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.project-domain {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg);
  border-radius: 4px;
  margin-top: 0.5rem;
}

.project-estimate {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}

.planning-main {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1rem;
}

.planning-welcome {
  text-align: center;
  max-width: 800px;
  margin: 2rem auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.feature-card {
  padding: 1.5rem;
  border: 1px solid var(--bord);
  border-radius: 8px;
  text-align: center;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bord);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-discovery { background: #3b82f6; color: white; }
.status-planning { background: #8b5cf6; color: white; }
.status-in-progress { background: #f59e0b; color: white; }
.status-completed { background: #10b981; color: white; }
.status-on-hold { background: #6b7280; color: white; }

.analysis-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1rem;
  border: 1px solid var(--bord);
  border-radius: 8px;
  background: var(--surf);
}

.summary-card.alert {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.summary-detail {
  font-size: 0.85rem;
  color: var(--fg2);
}

.planning-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--bord);
  border-radius: 8px;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chat-welcome {
  padding: 2rem;
  text-align: center;
}

.chat-welcome ul {
  text-align: left;
  max-width: 500px;
  margin: 1rem auto;
}

.chat-message {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
}

.chat-message.user {
  background: var(--grn);
  color: white;
  margin-left: 20%;
}

.chat-message.assistant {
  background: var(--surf);
  margin-right: 20%;
}

.message-analysis {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--bord);
}

.analysis-section {
  margin-top: 0.5rem;
  border: 1px solid var(--bord);
  border-radius: 4px;
  padding: 0.5rem;
}

.risk-item {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 4px;
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-high, .badge-critical { background: #ef4444; color: white; }
.badge-medium { background: #f59e0b; color: white; }
.badge-low { background: #10b981; color: white; }

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--bord);
  background: var(--surf);
}

.chat-input textarea {
  flex: 1;
  resize: none;
  font-family: inherit;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg);
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content form label {
  display: block;
  margin-bottom: 1rem;
}

.modal-content input,
.modal-content textarea,
.modal-content select {
  width: 100%;
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--fg2);
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}
*/
