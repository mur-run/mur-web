export type Tier = 'Session' | 'Project' | 'Global';
export type Maturity = 'Draft' | 'Emerging' | 'Stable' | 'Canonical';
export type DataSource = 'local' | 'cloud' | 'demo';

export interface CodeExample {
  language: string;
  code: string;
  description?: string;
}

export interface PatternStats {
  injections: number;
  last_used: string;
  created: string;
  updated: string;
}

export interface Pattern {
  id: string;
  description: string;
  triggers: string[];
  tags: string[];
  tier: Tier;
  maturity: Maturity;
  confidence: number;
  examples: CodeExample[];
  diagrams?: string[];
  related?: string[];
  stats: PatternStats;
  archived?: boolean;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'path' | 'url' | 'number' | 'bool' | 'array';
  required: boolean;
  default_value?: string;
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
  tools?: string[];
  variables?: WorkflowVariable[];
  created: string;
  updated: string;
}

export interface DashboardStats {
  totalPatterns: number;
  totalWorkflows: number;
  avgConfidence: number;
  activePatterns: number;
  maturityDistribution: Record<Maturity, number>;
}

export interface Session {
  id: string;
  event_count: number;
  file_size: number;
  modified_at: string;
  source?: string;
  started_at?: string;
  stopped_at?: string;
  title?: string;
  tools_used?: string[];
  user_turns?: number;
  assistant_turns?: number;
}

export interface SessionEvent {
  timestamp: number;
  type: string;
  tool?: string;
  content: string;
}

export interface SessionDetail extends Session {
  events: SessionEvent[];
}

export interface Pipeline {
  id: string;
  expression: string;
  description: string;
  created?: string;
  updated?: string;
}

export interface PipelineValidation {
  valid: boolean;
  ast?: unknown;
  error?: string;
}

export interface PipelineRunResult {
  output: string;
  exit_code?: number;
  duration?: number;
}

export type PipelineOperator = '|' | '&&' | ',';

export interface PatternTemplate {
  name: string;
  icon: string;
  description: string;
  defaults: Partial<Pattern>;
}
