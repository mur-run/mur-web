<script lang="ts">
  import WorkflowCard from '../components/WorkflowCard.svelte';
  import HealthGauge from '../components/HealthGauge.svelte';
  import { navigate } from '../lib/router';

  // Mock data for Commander workflows
  interface CommanderWorkflow {
    id: string;
    name: string;
    description: string;
    healthScore: number;
    status: 'idle' | 'running' | 'failed';
    lastRun?: string;
  }

  interface Execution {
    id: string;
    workflowId: string;
    workflowName: string;
    status: 'running' | 'success' | 'failed';
    startedAt: string;
    duration?: number;
    cost?: number;
    steps: number;
    completedSteps: number;
  }

  let workflows = $state<CommanderWorkflow[]>([
    { id: 'wf-deploy', name: 'Production Deploy', description: 'Build, test, and deploy to production', healthScore: 92, status: 'idle', lastRun: new Date(Date.now() - 3600000).toISOString() },
    { id: 'wf-test', name: 'Test Suite', description: 'Run full test suite with coverage', healthScore: 78, status: 'running', lastRun: new Date(Date.now() - 600000).toISOString() },
    { id: 'wf-sync', name: 'Data Sync', description: 'Sync patterns from remote sources', healthScore: 45, status: 'failed', lastRun: new Date(Date.now() - 86400000).toISOString() },
    { id: 'wf-backup', name: 'Daily Backup', description: 'Automated backup of all data', healthScore: 95, status: 'idle', lastRun: new Date(Date.now() - 43200000).toISOString() },
    { id: 'wf-lint', name: 'Code Quality', description: 'Lint and format all source files', healthScore: 67, status: 'idle', lastRun: new Date(Date.now() - 172800000).toISOString() },
  ]);

  let recentExecutions = $state<Execution[]>([
    { id: 'exec-1', workflowId: 'wf-test', workflowName: 'Test Suite', status: 'running', startedAt: new Date(Date.now() - 600000).toISOString(), steps: 5, completedSteps: 3 },
    { id: 'exec-2', workflowId: 'wf-deploy', workflowName: 'Production Deploy', status: 'success', startedAt: new Date(Date.now() - 3600000).toISOString(), duration: 245000, cost: 0.12, steps: 8, completedSteps: 8 },
    { id: 'exec-3', workflowId: 'wf-sync', workflowName: 'Data Sync', status: 'failed', startedAt: new Date(Date.now() - 86400000).toISOString(), duration: 12000, cost: 0.02, steps: 4, completedSteps: 2 },
    { id: 'exec-4', workflowId: 'wf-backup', workflowName: 'Daily Backup', status: 'success', startedAt: new Date(Date.now() - 43200000).toISOString(), duration: 89000, cost: 0.05, steps: 3, completedSteps: 3 },
  ]);

  const avgHealth = $derived(Math.round(workflows.reduce((sum, w) => sum + w.healthScore, 0) / workflows.length));
  const runningCount = $derived(recentExecutions.filter(e => e.status === 'running').length);
  const totalCost = $derived(recentExecutions.reduce((sum, e) => sum + (e.cost ?? 0), 0));

  function handleRun(wf: CommanderWorkflow) {
    wf.status = 'running';
    wf.lastRun = new Date().toISOString();
    workflows = [...workflows];
  }

  function formatDuration(ms: number): string {
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  }

  const statusBadge: Record<Execution['status'], { label: string; cls: string }> = {
    running: { label: 'Running', cls: 'bg-emerald-500/10 text-emerald-400' },
    success: { label: 'Success', cls: 'bg-emerald-500/10 text-emerald-400' },
    failed: { label: 'Failed', cls: 'bg-rose-500/10 text-rose-400' },
  };
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Commander</h1>
      <p class="text-sm text-slate-400 mt-1">Workflow orchestration & monitoring</p>
    </div>
    <a href="#/commander/health" class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">
      Health Dashboard
    </a>
  </div>

  <!-- Summary stats -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <div class="text-sm text-slate-400">Active Workflows</div>
      <div class="mt-2 text-3xl font-bold text-slate-100">{workflows.length}</div>
      <div class="mt-1 text-xs text-slate-500">{runningCount} currently running</div>
    </div>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <div class="text-sm text-slate-400">Avg Health</div>
      <div class="mt-2 text-3xl font-bold {avgHealth >= 80 ? 'text-emerald-400' : avgHealth >= 60 ? 'text-amber-400' : 'text-rose-400'}">
        {avgHealth}
      </div>
      <div class="mt-1 text-xs text-slate-500">across all workflows</div>
    </div>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <div class="text-sm text-slate-400">Executions Today</div>
      <div class="mt-2 text-3xl font-bold text-slate-100">{recentExecutions.length}</div>
      <div class="mt-1 text-xs text-slate-500">{recentExecutions.filter(e => e.status === 'success').length} successful</div>
    </div>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <div class="text-sm text-slate-400">Total Cost</div>
      <div class="mt-2 text-3xl font-bold text-slate-100">${totalCost.toFixed(2)}</div>
      <div class="mt-1 text-xs text-slate-500">this session</div>
    </div>
  </div>

  <!-- Workflows grid -->
  <div>
    <h2 class="text-sm font-medium text-slate-300 mb-3">Workflows</h2>
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {#each workflows as wf}
        <WorkflowCard
          name={wf.name}
          description={wf.description}
          healthScore={wf.healthScore}
          lastRun={wf.lastRun}
          status={wf.status}
          onrun={() => handleRun(wf)}
          onclick={() => navigate('/commander/exec/' + wf.id)}
        />
      {/each}
    </div>
  </div>

  <!-- Recent executions -->
  <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-300">Recent Executions</h2>
    </div>
    <div class="space-y-2">
      {#each recentExecutions as exec}
        {@const badge = statusBadge[exec.status]}
        <a
          href="#/commander/exec/{exec.id}"
          class="flex items-center gap-4 rounded-lg p-3 -mx-1 hover:bg-slate-700/30 transition-colors"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-slate-200">{exec.workflowName}</span>
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium {badge.cls}">{badge.label}</span>
            </div>
            <div class="flex items-center gap-3 mt-0.5">
              <span class="text-[11px] text-slate-500">{formatTime(exec.startedAt)}</span>
              {#if exec.duration}
                <span class="text-[11px] text-slate-500">{formatDuration(exec.duration)}</span>
              {/if}
              <span class="text-[11px] text-slate-500">{exec.completedSteps}/{exec.steps} steps</span>
            </div>
          </div>
          {#if exec.cost !== undefined}
            <span class="text-xs text-slate-500 shrink-0">${exec.cost.toFixed(2)}</span>
          {/if}
        </a>
      {/each}
    </div>
  </div>
</div>
