// Types for mur-commander API (port 3939)

export type StepType = 'Execute' | 'Analyze' | 'Code' | 'Refactor' | 'Fix' | 'Review' | 'Test' | 'Deploy';
export type FailureAction = 'Abort' | 'Skip' | 'Retry' | 'AutoFix';
export type ActionDecision = 'Allowed' | 'NeedsApproval' | 'Blocked';

export interface CommanderStep {
  name: string;
  step_type: StepType;
  action: string;
  on_failure: FailureAction;
  breakpoint: boolean;
  breakpoint_message?: string;
}

export interface CommanderWorkflow {
  id: string;
  name: string;
  description: string;
  steps: CommanderStep[];
  variables: Record<string, string>;
  schedule?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  session_id: string;
  workflow_id?: string;
  action_type: string;
  action_detail: string;
  model_used?: string;
  cost?: number;
  input_hash: string;
  output_summary: string;
  decision: ActionDecision;
  approved_by?: string;
  duration_ms: number;
  success: boolean;
  error?: string;
  prev_hash: string;
  entry_hash: string;
}

export interface StepResult {
  step_name: string;
  success: boolean;
  output: string;
  duration_ms: number;
  cost: number;
  error?: string;
}

export interface ExecutionResult {
  execution_id: string;
  workflow_id: string;
  steps_completed: number;
  steps_total: number;
  success: boolean;
  duration_ms: number;
  total_cost: number;
  step_results: StepResult[];
  shadow: boolean;
  error?: string;
  started_at: string;
  finished_at: string;
}

export interface CommanderHealth {
  status: string;
  version: string;
}
