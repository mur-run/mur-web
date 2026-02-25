// Shared reactive data store — single source of truth for patterns + workflows
// Solves: WS refetch (#2), CommandPalette re-fetch (#5), cache

import type { Pattern, Workflow } from './types';
import * as api from './api';

type Listener = () => void;

let _patterns: Pattern[] = [];
let _workflows: Workflow[] = [];
let _loaded = false;
let _listeners: Listener[] = [];

function notify() {
  _listeners.forEach(l => l());
}

export function subscribe(fn: Listener): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

export async function load() {
  const [p, w] = await Promise.all([api.getPatterns(), api.getWorkflows()]);
  _patterns = p;
  _workflows = w;
  _loaded = true;
  notify();
}

export async function refresh() {
  await load();
}

export function getPatterns(): Pattern[] { return _patterns; }
export function getWorkflows(): Workflow[] { return _workflows; }
export function isLoaded(): boolean { return _loaded; }

// Mutations — update local cache + call API
export async function createPattern(p: Omit<Pattern, 'id' | 'stats'>): Promise<Pattern> {
  const created = await api.createPattern(p);
  _patterns = [..._patterns, created];
  notify();
  return created;
}

export async function updatePattern(id: string, updates: Partial<Pattern>): Promise<Pattern> {
  const updated = await api.updatePattern(id, updates);
  _patterns = _patterns.map(p => p.id === id ? updated : p);
  notify();
  return updated;
}

export async function deletePattern(id: string): Promise<void> {
  await api.deletePattern(id);
  _patterns = _patterns.filter(p => p.id !== id);
  notify();
}

export async function createWorkflow(wf: Omit<Workflow, 'id' | 'created' | 'updated'>): Promise<Workflow> {
  const created = await api.createWorkflow(wf);
  _workflows = [..._workflows, created];
  notify();
  return created;
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
  const updated = await api.updateWorkflow(id, updates);
  _workflows = _workflows.map(w => w.id === id ? updated : w);
  notify();
  return updated;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api.deleteWorkflow(id);
  _workflows = _workflows.filter(w => w.id !== id);
  notify();
}
