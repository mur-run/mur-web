import type { Pattern, Workflow, DashboardStats, DataSource } from './types';
import { mockPatterns, mockWorkflows } from './mock-data';

let dataSource: DataSource = 'demo';
let baseUrl = '';

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
  try {
    const res = await fetch('http://localhost:3847/api/v1/health', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      setDataSource('local');
      return 'local';
    }
  } catch {
    // local not available
  }
  setDataSource('demo');
  return 'demo';
}

function apiPath(path: string): string {
  return `/api/v1${path}`;
}

async function apiGet<T>(path: string): Promise<T> {
  if (dataSource === 'demo') throw new Error('demo mode');
  const res = await fetch(`${baseUrl}${apiPath(path)}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (dataSource === 'demo') throw new Error('demo mode');
  const res = await fetch(`${baseUrl}${apiPath(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  if (dataSource === 'demo') throw new Error('demo mode');
  const res = await fetch(`${baseUrl}${apiPath(path)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  if (dataSource === 'demo') throw new Error('demo mode');
  const res = await fetch(`${baseUrl}${apiPath(path)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// --- Pattern API ---

let demoPatterns = [...mockPatterns];

export async function getPatterns(): Promise<Pattern[]> {
  if (dataSource === 'demo') return demoPatterns;
  return apiGet<Pattern[]>('/patterns');
}

export async function getPattern(id: string): Promise<Pattern | undefined> {
  if (dataSource === 'demo') return demoPatterns.find(p => p.id === id);
  return apiGet<Pattern>(`/patterns/${id}`);
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
  return apiGet<Workflow[]>('/workflows');
}

export async function createWorkflow(wf: Omit<Workflow, 'id' | 'created' | 'updated'>): Promise<Workflow> {
  if (dataSource === 'demo') {
    const newWf: Workflow = { ...wf, id: `workflow-${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString() };
    demoWorkflows = [...demoWorkflows, newWf];
    return newWf;
  }
  return apiPost<Workflow>('/workflows', wf);
}

export async function updateWorkflow(id: string, wf: Partial<Workflow>): Promise<Workflow> {
  if (dataSource === 'demo') {
    const idx = demoWorkflows.findIndex(w => w.id === id);
    if (idx === -1) throw new Error('Workflow not found');
    const updated = { ...demoWorkflows[idx], ...wf, updated: new Date().toISOString() };
    demoWorkflows = [...demoWorkflows.slice(0, idx), updated, ...demoWorkflows.slice(idx + 1)];
    return updated;
  }
  return apiPut<Workflow>(`/workflows/${id}`, wf);
}

export async function deleteWorkflow(id: string): Promise<void> {
  if (dataSource === 'demo') {
    demoWorkflows = demoWorkflows.filter(w => w.id !== id);
    return;
  }
  await apiDelete(`/workflows/${id}`);
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
