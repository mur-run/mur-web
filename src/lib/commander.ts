// API client for mur-commander daemon (port 3939)

import type { CommanderWorkflow, AuditEntry, ExecutionResult, CommanderHealth } from './commander-types';

const COMMANDER_URL = 'http://localhost:3939';

let _connected = false;

export function isCommanderConnected(): boolean {
  return _connected;
}

export async function detectCommander(): Promise<boolean> {
  try {
    const res = await fetch(`${COMMANDER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      _connected = true;
      return true;
    }
  } catch {
    // commander not available
  }
  _connected = false;
  return false;
}

async function cmdGet<T>(path: string): Promise<T> {
  const res = await fetch(`${COMMANDER_URL}${path}`);
  if (!res.ok) throw new Error(`Commander API error: ${res.status}`);
  return res.json();
}

async function cmdPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${COMMANDER_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Commander API error: ${res.status}`);
  return res.json();
}

async function cmdPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${COMMANDER_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Commander API error: ${res.status}`);
  return res.json();
}

async function cmdDelete(path: string): Promise<void> {
  const res = await fetch(`${COMMANDER_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Commander API error: ${res.status}`);
}

// --- Health ---

export async function getHealth(): Promise<CommanderHealth> {
  return cmdGet<CommanderHealth>('/health');
}

// --- Workflows ---

export async function getWorkflows(): Promise<CommanderWorkflow[]> {
  return cmdGet<CommanderWorkflow[]>('/api/workflows');
}

export async function createWorkflow(wf: Omit<CommanderWorkflow, 'id' | 'created_at' | 'updated_at'>): Promise<CommanderWorkflow> {
  return cmdPost<CommanderWorkflow>('/api/editor/workflows', wf);
}

export async function updateWorkflow(id: string, wf: Partial<CommanderWorkflow>): Promise<CommanderWorkflow> {
  return cmdPut<CommanderWorkflow>(`/api/editor/workflows/${id}`, wf);
}

export async function deleteWorkflow(id: string): Promise<void> {
  await cmdDelete(`/api/editor/workflows/${id}`);
}

export async function runWorkflow(id: string, opts?: { shadow?: boolean; vars?: Record<string, string> }): Promise<ExecutionResult> {
  const params = new URLSearchParams();
  if (opts?.shadow) params.set('shadow', 'true');
  if (opts?.vars) {
    const varsStr = Object.entries(opts.vars).map(([k, v]) => `${k}=${v}`).join(',');
    params.set('vars', varsStr);
  }
  const qs = params.toString();
  return cmdPost<ExecutionResult>(`/workflows/${id}/run${qs ? '?' + qs : ''}`);
}

// --- Audit ---

export async function searchAudit(query?: string): Promise<AuditEntry[]> {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return cmdGet<AuditEntry[]>(`/api/audit/search${params}`);
}
