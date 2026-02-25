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

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
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

export interface PatternTemplate {
  name: string;
  icon: string;
  description: string;
  defaults: Partial<Pattern>;
}
