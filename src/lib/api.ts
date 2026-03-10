import type { Pattern, Workflow, DashboardStats, DataSource, Session, SessionDetail, Pipeline, PipelineValidation, PipelineRunResult } from './types';
import { mockPatterns, mockWorkflows } from './mock-data';
import { adaptPattern, adaptWorkflow, unwrapList, unwrapOne } from './adapter';

let dataSource: DataSource = 'demo';
let baseUrl = '';

// Backend detection promise — other API calls wait on this
let backendReady: Promise<DataSource> | null = null;
let backendResolved = false;

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
  if (dataSource === 'demo') return demoPatterns;
  const raw = await apiGet<unknown>('/patterns');
  return unwrapList(raw).map(adaptPattern);
}

export async function getPattern(id: string): Promise<Pattern | undefined> {
  if (dataSource === 'demo') return demoPatterns.find(p => p.id === id);
  const raw = await apiGet<unknown>(`/patterns/${id}`);
  return adaptPattern(unwrapOne(raw));
}

export async function createPattern(pattern: Omit<Pattern, 'id' | 'stats'>): Promise<Pattern> {
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
  if (dataSource === 'demo') {
    demoPatterns = demoPatterns.filter(p => p.id !== id);
    return;
  }
  await apiDelete(`/patterns/${id}`);
}

// --- Workflow API ---

let demoWorkflows = [...mockWorkflows];

export async function getWorkflows(): Promise<Workflow[]> {
  if (dataSource === 'demo') return demoWorkflows;
  const raw = await apiGet<unknown>('/workflows');
  return unwrapList(raw).map(adaptWorkflow);
}

export async function createWorkflow(wf: Omit<Workflow, 'id' | 'created' | 'updated'>): Promise<Workflow> {
  if (dataSource === 'demo') {
    const newWf: Workflow = { ...wf, id: `workflow-${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString() };
    demoWorkflows = [...demoWorkflows, newWf];
    return newWf;
  }
  const raw = await apiPost<unknown>('/workflows', wf);
  return adaptWorkflow(unwrapOne(raw) as any);
}

export async function updateWorkflow(id: string, wf: Partial<Workflow>): Promise<Workflow> {
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

export async function getSessions(): Promise<Session[]> {
  const raw = await apiGet<{ data: Session[] }>('/sessions');
  return raw.data;
}

export async function getSession(id: string): Promise<SessionDetail> {
  const raw = await apiGet<{ data: SessionDetail }>(`/sessions/${id}`);
  return raw.data;
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
  const raw = await apiGet<{ data: Pipeline[] }>('/pipelines');
  return raw.data || [];
}

export async function getPipeline(id: string): Promise<Pipeline | undefined> {
  await ensureBackend();
  if (dataSource === 'demo') return demoPipelines.find(p => p.id === id);
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
  const raw = await apiPut<{ data: Pipeline }>(`/pipelines/${id}`, pipeline);
  return raw.data;
}

export async function deletePipeline(id: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') {
    demoPipelines = demoPipelines.filter(p => p.id !== id);
    return;
  }
  await apiDelete(`/pipelines/${id}`);
}

export async function runPipeline(id: string): Promise<PipelineRunResult> {
  await ensureBackend();
  if (dataSource === 'demo') {
    return { output: `[demo] Pipeline "${id}" executed successfully`, exit_code: 0, duration: 1200 };
  }
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
