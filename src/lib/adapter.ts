// Adapts mur v2 API response format to frontend types
import type { Pattern, Workflow, Maturity, Tier } from './types';

// --- API response types (what mur serve actually returns) ---

interface ApiResponse<T> {
  data: T;
  meta: { source: string; version: string; pattern_count: number };
}

interface ApiPattern {
  schema?: number;
  name: string;
  description: string;
  content: { Plain?: string; DualLayer?: { technical: string; principle?: string } };
  tier: string;
  importance?: number;
  confidence: number;
  tags: { topics?: string[]; languages?: string[]; frameworks?: string[] };
  applies?: { triggers?: string[] };
  evidence?: { injection_count?: number; last_injected?: string };
  links?: { related?: string[] };
  lifecycle?: { maturity?: string; archived?: boolean };
  created_at: string;
  updated_at: string;
  attachments?: unknown[];
}

interface ApiWorkflow {
  name: string;
  description: string;
  trigger?: string;
  tools?: string[];
  steps?: { name?: string; description?: string }[];
  created_at: string;
  updated_at: string;
}

// --- Adapters ---

function mapMaturity(m?: string): Maturity {
  if (!m) return 'Draft';
  const lower = m.toLowerCase();
  if (lower === 'emerging') return 'Emerging';
  if (lower === 'stable') return 'Stable';
  if (lower === 'canonical') return 'Canonical';
  return 'Draft';
}

function mapTier(t: string): Tier {
  const lower = t.toLowerCase();
  if (lower === 'project') return 'Project';
  if (lower === 'global' || lower === 'core') return 'Global';
  return 'Session';
}

export function adaptPattern(api: ApiPattern): Pattern {
  const allTags = [
    ...(api.tags?.topics || []),
    ...(api.tags?.languages || []),
    ...(api.tags?.frameworks || []),
  ];

  return {
    id: api.name,
    description: api.description,
    triggers: api.applies?.triggers || [],
    tags: allTags,
    tier: mapTier(api.tier),
    maturity: mapMaturity(api.lifecycle?.maturity),
    confidence: api.confidence,
    examples: [], // v2 API doesn't have examples in the same format
    related: api.links?.related,
    archived: api.lifecycle?.archived,
    stats: {
      injections: api.evidence?.injection_count || 0,
      last_used: api.evidence?.last_injected || api.updated_at,
      created: api.created_at,
      updated: api.updated_at,
    },
  };
}

export function adaptWorkflow(api: ApiWorkflow): Workflow {
  return {
    id: api.name,
    name: api.name,
    description: api.description,
    steps: api.steps?.map(s => s.description || s.name || '') || [],
    created: api.created_at,
    updated: api.updated_at,
  };
}

// Unwrap ApiResponse envelope
export function unwrapList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  const r = response as ApiResponse<T[]>;
  if (r?.data && Array.isArray(r.data)) return r.data;
  return [];
}

export function unwrapOne<T>(response: unknown): T {
  const r = response as ApiResponse<T>;
  if (r?.data) return r.data;
  return response as T;
}
