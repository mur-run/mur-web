import type { Pattern, Workflow, DashboardStats, DataSource, Session, SessionDetail, Pipeline, PipelineValidation, PipelineRunResult } from './types';
import { mockPatterns, mockWorkflows } from './mock-data';
import { adaptPattern, adaptWorkflow, unwrapList, unwrapOne } from './adapter';

let dataSource: DataSource = 'demo';
let baseUrl = '';

// --- Relay Helper ---

const RELAY_URL = 'https://mur-server.fly.dev/api/v1/relay/command';
const AUTH_TOKEN_KEY = 'mur-auth-token';

/** Get the stored auth token for cloud API calls. */
export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
}

/** Set the auth token for cloud API calls. */
export function setAuthToken(token: string) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/**
 * Send a command to the Commander relay (cloud mode only).
 * Returns the data on success, or null if relay is unavailable / not in cloud mode.
 */
async function relayCommand<T = unknown>(action: string, params: object = {}, timeoutMs = 10000): Promise<T | null> {
  if (dataSource !== 'cloud') return null;
  const token = getAuthToken();
  if (!token) {
    console.debug('[relay] no auth token configured — skipping relay');
    return null;
  }
  try {
    const res = await fetch(RELAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 401) {
      console.warn('[relay] auth token rejected (401) — check Settings');
      return null;
    }
    if (res.ok) {
      const result = await res.json();
      if (result.success) return result.data ?? null;
    }
  } catch (e) {
    console.debug(`[relay] ${action} unavailable:`, e);
  }
  return null;
}

// Backend detection promise — other API calls wait on this
let backendReady: Promise<DataSource> | null = null;
let backendResolved = false;

/** Is this the hosted dashboard (dashboard.mur.run / GitHub Pages)? */
function isHosted(): boolean {
  const h = window.location.hostname;
  return h === 'dashboard.mur.run' || h === 'mur-run.github.io';
}

export function getDataSource(): DataSource {
  return dataSource;
}

export function setDataSource(source: DataSource) {
  dataSource = source;
  if (source === 'local') baseUrl = 'http://localhost:3847';
  else if (source === 'cloud') baseUrl = 'https://mur-server.fly.dev';
  else baseUrl = '';
}

export async function detectBackend(): Promise<DataSource> {
  if (backendReady) return backendReady;
  backendReady = doDetectBackend();
  return backendReady;
}

async function doDetectBackend(): Promise<DataSource> {
  // Hosted dashboard → always cloud (can't reach localhost anyway)
  if (isHosted()) {
    setDataSource('cloud');
    backendResolved = true;
    return 'cloud';
  }

  // Localhost → try local mur serve, fallback to demo
  try {
    const res = await fetch('http://localhost:3847/api/v1/health', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      setDataSource('local');
      backendResolved = true;
      return 'local';
    }
  } catch {
    // local not available
  }

  setDataSource('demo');
  backendResolved = true;
  return 'demo';
}

/** Wait for backend detection before making API calls */
async function ensureBackend(): Promise<void> {
  if (backendResolved) return;
  // If detectBackend hasn't been called yet, call it now
  if (!backendReady) backendReady = doDetectBackend();
  await backendReady;
}

function apiPath(path: string): string {
  return `/api/v1${path}`;
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  } catch { /* ignore parse errors */ }
  return `API error: ${res.status} ${res.statusText}`;
}

async function apiGet<T>(path: string): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`);
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, { method: 'DELETE' });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
}

// --- Pattern API ---

let demoPatterns = [...mockPatterns];

export async function getPatterns(): Promise<Pattern[]> {
  await ensureBackend();
  if (dataSource === 'demo') return demoPatterns;
  try {
    const raw = await apiGet<unknown>('/patterns');
    return unwrapList(raw).map(adaptPattern);
  } catch (e) {
    console.warn('[api] getPatterns failed:', e);
    return [];
  }
}

export async function getPattern(id: string): Promise<Pattern | undefined> {
  await ensureBackend();
  if (dataSource === 'demo') return demoPatterns.find(p => p.id === id);
  const raw = await apiGet<unknown>(`/patterns/${id}`);
  return adaptPattern(unwrapOne(raw));
}

export async function createPattern(pattern: Omit<Pattern, 'id' | 'stats'>): Promise<Pattern> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const newPattern: Pattern = {
      ...pattern,
      id: `pattern-${Date.now()}`,
      stats: { injections: 0, last_used: new Date().toISOString(), created: new Date().toISOString(), updated: new Date().toISOString() },
    };
    demoPatterns = [...demoPatterns, newPattern];
    return newPattern;
  }
  return apiPost<Pattern>('/patterns', pattern);
}

export async function updatePattern(id: string, pattern: Partial<Pattern>): Promise<Pattern> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const idx = demoPatterns.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Pattern not found');
    const updated = { ...demoPatterns[idx], ...pattern, stats: { ...demoPatterns[idx].stats, updated: new Date().toISOString() } };
    demoPatterns = [...demoPatterns.slice(0, idx), updated, ...demoPatterns.slice(idx + 1)];
    return updated;
  }
  return apiPut<Pattern>(`/patterns/${id}`, pattern);
}

export async function deletePattern(id: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') {
    demoPatterns = demoPatterns.filter(p => p.id !== id);
    return;
  }
  await apiDelete(`/patterns/${id}`);
}

// --- Workflow API ---

let demoWorkflows = [...mockWorkflows];

export async function getWorkflows(): Promise<Workflow[]> {
  await ensureBackend();
  if (dataSource === 'demo') return demoWorkflows;

  // Cloud mode: try relay first (reads local Commander workflows)
  const relayWfs = await relayCommand<Workflow[]>('list_workflows');
  if (relayWfs && Array.isArray(relayWfs)) {
    return relayWfs.map(w => ({
      ...w,
      id: w.id || w.name || `wf-${Date.now()}`,
      created: w.created || new Date().toISOString(),
      updated: w.updated || new Date().toISOString(),
    }));
  }

  try {
    const raw = await apiGet<unknown>('/workflows');
    return unwrapList(raw).map(adaptWorkflow);
  } catch (e) {
    console.warn('[api] getWorkflows failed:', e);
    return [];
  }
}

export async function createWorkflow(wf: Omit<Workflow, 'id' | 'created' | 'updated'>): Promise<Workflow> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const newWf: Workflow = { ...wf, id: `workflow-${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString() };
    demoWorkflows = [...demoWorkflows, newWf];
    return newWf;
  }
  const raw = await apiPost<unknown>('/workflows', wf);
  return adaptWorkflow(unwrapOne(raw) as any);
}

export async function updateWorkflow(id: string, wf: Partial<Workflow>): Promise<Workflow> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const idx = demoWorkflows.findIndex(w => w.id === id);
    if (idx === -1) throw new Error('Workflow not found');
    const updated = { ...demoWorkflows[idx], ...wf, updated: new Date().toISOString() };
    demoWorkflows = [...demoWorkflows.slice(0, idx), updated, ...demoWorkflows.slice(idx + 1)];
    return updated;
  }
  const raw = await apiPut<unknown>(`/workflows/${id}`, wf);
  return adaptWorkflow(unwrapOne(raw) as any);
}

export async function deleteWorkflow(id: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') {
    demoWorkflows = demoWorkflows.filter(w => w.id !== id);
    return;
  }
  await apiDelete(`/workflows/${id}`);
}

export interface WorkflowSearchResult {
  name: string;
  description: string;
  score: number;
}

export async function searchWorkflows(query: string, limit: number = 10): Promise<WorkflowSearchResult[]> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const q = query.toLowerCase();
    return demoWorkflows
      .filter(w => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
      .map(w => ({ name: w.name, description: w.description, score: 0.5 }));
  }
  const raw = await apiPost<unknown>('/workflows/search', { query, limit });
  const data = (raw as any)?.data || [];
  return Array.isArray(data) ? data : [];
}

// --- Session API ---

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

const mockSessions: Session[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    event_count: 26,
    file_size: 5500,
    modified_at: '2026-03-10T09:09:00Z',
    source: 'claude-code',
    started_at: '2026-03-10T09:00:00Z',
    stopped_at: '2026-03-10T09:12:00Z',
    title: 'Fix pipeline executor parallel mode',
    tools_used: ['Bash', 'Read', 'Write'],
    user_turns: 3,
    assistant_turns: 8,
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    event_count: 42,
    file_size: 12800,
    modified_at: '2026-03-09T14:30:00Z',
    source: 'codex',
    started_at: '2026-03-09T14:00:00Z',
    stopped_at: '2026-03-09T14:45:00Z',
    title: 'Refactor authentication middleware',
    tools_used: ['Read', 'Edit', 'Grep', 'Bash'],
    user_turns: 7,
    assistant_turns: 15,
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    event_count: 15,
    file_size: 3200,
    modified_at: '2026-03-09T10:15:00Z',
    source: 'cursor',
    started_at: '2026-03-09T10:00:00Z',
    stopped_at: '2026-03-09T10:20:00Z',
    title: 'Add unit tests for workflow service',
    tools_used: ['Write', 'Bash'],
    user_turns: 2,
    assistant_turns: 5,
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    event_count: 58,
    file_size: 22400,
    modified_at: '2026-03-08T16:45:00Z',
    source: 'claude-code',
    started_at: '2026-03-08T15:30:00Z',
    stopped_at: '2026-03-08T17:00:00Z',
    title: 'Implement i18n for all dashboard pages',
    tools_used: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],
    user_turns: 10,
    assistant_turns: 22,
  },
  {
    id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
    event_count: 8,
    file_size: 1800,
    modified_at: '2026-03-08T11:00:00Z',
    source: 'claude-code',
    started_at: '2026-03-08T10:50:00Z',
    stopped_at: '2026-03-08T11:05:00Z',
    title: 'Quick CSS fix for sidebar collapse',
    tools_used: ['Read', 'Edit'],
    user_turns: 1,
    assistant_turns: 3,
  },
];

let demoSessions = [...mockSessions];

export async function getSessions(): Promise<Session[]> {
  await ensureBackend();
  if (dataSource === 'demo') return demoSessions;
  const raw = await apiGet<{ data: Session[] }>('/sessions');
  return raw.data;
}

export async function getSession(id: string): Promise<SessionDetail> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const s = demoSessions.find(s => s.id === id);
    if (!s) throw new Error('Session not found');
    return { ...s, events: [] };
  }
  const raw = await apiGet<{ data: SessionDetail }>(`/sessions/${id}`);
  return raw.data;
}

export async function deleteSession(id: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') {
    demoSessions = demoSessions.filter(s => s.id !== id);
    return;
  }
  await apiDelete(`/sessions/${id}`);
}

export async function bulkDeleteSessions(ids: string[]): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const idSet = new Set(ids);
    demoSessions = demoSessions.filter(s => !idSet.has(s.id));
    return;
  }
  await apiPost('/sessions/bulk-delete', { ids });
}

export async function updateSession(id: string, data: { title: string }): Promise<Session> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const idx = demoSessions.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Session not found');
    demoSessions[idx] = { ...demoSessions[idx], ...data };
    demoSessions = [...demoSessions];
    return demoSessions[idx];
  }
  return apiPatch<Session>(`/sessions/${id}`, data);
}

// --- Extract Workflow from Session ---

export async function extractWorkflowFromSession(sessionId: string): Promise<Workflow> {
  const raw = await apiPost<unknown>(`/workflows/extract-from-session/${sessionId}`, {});
  return adaptWorkflow(unwrapOne(raw) as any);
}

// --- Pipeline API ---

let demoPipelines: Pipeline[] = [];

export async function getPipelines(): Promise<Pipeline[]> {
  await ensureBackend();
  if (dataSource === 'demo') return demoPipelines;

  const relayData = await relayCommand<Pipeline[]>('list_pipelines');
  if (relayData) return relayData;

  const raw = await apiGet<{ data: Pipeline[] }>('/pipelines');
  return raw.data || [];
}

export async function getPipeline(id: string): Promise<Pipeline | undefined> {
  await ensureBackend();
  if (dataSource === 'demo') return demoPipelines.find(p => p.id === id);

  const relayData = await relayCommand<Pipeline>('get_pipeline', { id });
  if (relayData) return relayData;

  const raw = await apiGet<{ data: Pipeline }>(`/pipelines/${id}`);
  return raw.data;
}

export async function createPipeline(pipeline: { id?: string; expression: string; description: string }): Promise<Pipeline> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const newP: Pipeline = {
      id: pipeline.id || `pipeline-${Date.now()}`,
      expression: pipeline.expression,
      description: pipeline.description,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    demoPipelines = [...demoPipelines, newP];
    return newP;
  }
  const relayData = await relayCommand<Pipeline>('create_pipeline', pipeline);
  if (relayData) return relayData;

  const raw = await apiPost<{ data: Pipeline }>('/pipelines', pipeline);
  return raw.data;
}

export async function updatePipeline(id: string, pipeline: Partial<Pipeline>): Promise<Pipeline> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const idx = demoPipelines.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Pipeline not found');
    const updated = { ...demoPipelines[idx], ...pipeline, updated: new Date().toISOString() };
    demoPipelines = [...demoPipelines.slice(0, idx), updated, ...demoPipelines.slice(idx + 1)];
    return updated;
  }
  const relayData = await relayCommand<Pipeline>('update_pipeline', { id, ...pipeline });
  if (relayData) return relayData;

  const raw = await apiPut<{ data: Pipeline }>(`/pipelines/${id}`, pipeline);
  return raw.data;
}

export async function deletePipeline(id: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') {
    demoPipelines = demoPipelines.filter(p => p.id !== id);
    return;
  }

  const relayData = await relayCommand('delete_pipeline', { id });
  if (relayData !== null) return;

  await apiDelete(`/pipelines/${id}`);
}

export async function runPipeline(id: string): Promise<PipelineRunResult> {
  await ensureBackend();
  if (dataSource === 'demo') {
    return { output: `[demo] Pipeline "${id}" executed successfully`, exit_code: 0, duration: 1200 };
  }

  const relayData = await relayCommand<PipelineRunResult>('run_pipeline', { id }, 30000);
  if (relayData) return relayData;

  return apiPost<PipelineRunResult>(`/pipelines/${id}/run`, {});
}

export async function runPipelineExpression(expression: string): Promise<PipelineRunResult> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const parts = expression.split(/\s*(&&|[|,])\s*/).filter(Boolean);
    const steps = parts.filter(p => p !== '|' && p !== '&&' && p !== ',');
    return {
      output: `[demo] Executed pipeline: ${steps.join(' → ')}\nAll ${steps.length} workflow(s) completed successfully.`,
      exit_code: 0,
      duration: steps.length * 400,
    };
  }
  const relayData = await relayCommand<PipelineRunResult>('run_pipeline', { expression }, 30000);
  if (relayData) return relayData;

  return apiPost<PipelineRunResult>('/pipelines/run', { expression });
}

export async function validatePipeline(expression: string): Promise<PipelineValidation> {
  await ensureBackend();
  if (dataSource === 'demo') {
    const trimmed = expression.trim();
    if (!trimmed) return { valid: false, error: 'Expression is empty' };
    const parts = trimmed.split(/\s*(&&|[|,])\s*/).filter(Boolean);
    const names: string[] = [];
    const ops: string[] = [];
    for (const p of parts) {
      if (p === '|' || p === '&&' || p === ',') ops.push(p);
      else names.push(p);
    }
    if (names.length === 0) return { valid: false, error: 'No workflow names found' };
    if (ops.length >= names.length) return { valid: false, error: 'Invalid operator placement' };
    return { valid: true, ast: { type: 'pipeline', steps: names, operators: ops } };
  }
  const relayData = await relayCommand<PipelineValidation>('validate_pipeline', { expression }, 30000);
  if (relayData) return relayData;

  return apiPost<PipelineValidation>('/pipelines/validate', { expression });
}

// --- Dashboard API ---

export async function getDashboardStats(): Promise<DashboardStats> {
  const patterns = await getPatterns();
  const workflows = await getWorkflows();
  const active = patterns.filter(p => !p.archived);
  const avgConf = active.length > 0 ? active.reduce((sum, p) => sum + p.confidence, 0) / active.length : 0;

  const maturityDistribution = { Draft: 0, Emerging: 0, Stable: 0, Canonical: 0 };
  for (const p of active) {
    maturityDistribution[p.maturity]++;
  }

  return {
    totalPatterns: patterns.length,
    totalWorkflows: workflows.length,
    avgConfidence: Math.round(avgConf * 100) / 100,
    activePatterns: active.length,
    maturityDistribution,
  };
}
