<script lang="ts">
  import ExecutionTimeline from '../components/ExecutionTimeline.svelte';
  import type { TimelineStep } from '../components/ExecutionTimeline.svelte';
  import { navigate } from '../lib/router';

  interface Props {
    id: string;
  }

  let { id }: Props = $props();

  // Mock execution data
  const executions: Record<string, {
    workflowName: string;
    status: 'running' | 'success' | 'failed';
    startedAt: string;
    completedAt?: string;
    duration?: number;
    cost: number;
    steps: TimelineStep[];
    liveOutput: string[];
  }> = {
    'exec-1': {
      workflowName: 'Test Suite',
      status: 'running',
      startedAt: new Date(Date.now() - 600000).toISOString(),
      cost: 0.08,
      steps: [
        { name: 'Install dependencies', status: 'success', duration: 12400, output: 'npm ci completed, 847 packages installed' },
        { name: 'Lint check', status: 'success', duration: 3200, output: 'No linting errors found' },
        { name: 'Unit tests', status: 'running', duration: undefined },
        { name: 'Integration tests', status: 'pending' },
        { name: 'Generate report', status: 'pending' },
      ],
      liveOutput: [
        '[00:00] Starting test suite...',
        '[00:12] Dependencies installed',
        '[00:15] Lint check passed',
        '[00:19] Running unit tests...',
        '[02:34] tests/auth.test.ts ............ PASS (24 tests)',
        '[04:12] tests/api.test.ts ............. PASS (31 tests)',
        '[05:48] tests/store.test.ts ........... RUNNING',
      ],
    },
    'exec-2': {
      workflowName: 'Production Deploy',
      status: 'success',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3355000).toISOString(),
      duration: 245000,
      cost: 0.12,
      steps: [
        { name: 'Checkout code', status: 'success', duration: 2100 },
        { name: 'Install dependencies', status: 'success', duration: 14200 },
        { name: 'Run tests', status: 'success', duration: 89000 },
        { name: 'Build', status: 'success', duration: 34000 },
        { name: 'Upload artifacts', status: 'success', duration: 8700 },
        { name: 'Deploy to staging', status: 'success', duration: 42000 },
        { name: 'Health check', status: 'success', duration: 15000 },
        { name: 'Promote to production', status: 'success', duration: 40000 },
      ],
      liveOutput: [
        '[00:00] Starting production deploy...',
        '[04:05] All tests passed (142/142)',
        '[04:39] Build complete - 2.4 MB bundle',
        '[04:48] Artifacts uploaded to S3',
        '[05:30] Staging deploy complete',
        '[05:45] Health check passed (200 OK)',
        '[06:25] Production deploy complete',
      ],
    },
    'exec-3': {
      workflowName: 'Data Sync',
      status: 'failed',
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 86388000).toISOString(),
      duration: 12000,
      cost: 0.02,
      steps: [
        { name: 'Connect to source', status: 'success', duration: 1200 },
        { name: 'Fetch remote data', status: 'success', duration: 4500 },
        { name: 'Validate schema', status: 'failed', duration: 2100, output: 'Error: Schema mismatch - field "tags" expected array, got string\n  at validate() line 47\n  at sync() line 112' },
        { name: 'Merge data', status: 'skipped' },
      ],
      liveOutput: [
        '[00:00] Connecting to remote source...',
        '[00:01] Connected successfully',
        '[00:06] Fetched 234 records',
        '[00:08] Validating schema...',
        '[00:10] ERROR: Schema mismatch detected',
        '[00:12] Sync aborted - see logs for details',
      ],
    },
  };

  // Default fallback for unknown IDs
  const defaultExec = {
    workflowName: 'Unknown Workflow',
    status: 'success' as const,
    startedAt: new Date().toISOString(),
    cost: 0,
    steps: [{ name: 'Step 1', status: 'success' as const, duration: 1000 }],
    liveOutput: ['No output available'],
  };

  const exec = $derived(executions[id] ?? defaultExec);

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  const statusLabel: Record<string, { text: string; cls: string }> = {
    running: { text: 'Running', cls: 'bg-emerald-500/10 text-emerald-400' },
    success: { text: 'Success', cls: 'bg-emerald-500/10 text-emerald-400' },
    failed: { text: 'Failed', cls: 'bg-rose-500/10 text-rose-400' },
  };
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <button
      onclick={() => navigate('/commander')}
      class="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" /></svg>
      Back to Commander
    </button>
    {#if true}
    {@const sl = statusLabel[exec.status]}
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold text-slate-100">{exec.workflowName}</h1>
      <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {sl.cls}">{sl.text}</span>
    </div>
    {/if}
    <p class="text-sm text-slate-400 mt-1">Execution {id}</p>
  </div>

  <!-- Execution stats -->
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
      <div class="text-xs text-slate-500">Started</div>
      <div class="mt-1 text-sm font-medium text-slate-200">{formatDateTime(exec.startedAt)}</div>
    </div>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
      <div class="text-xs text-slate-500">Duration</div>
      <div class="mt-1 text-sm font-medium text-slate-200">
        {#if exec.duration}
          {formatDuration(exec.duration)}
        {:else}
          <span class="text-emerald-400 animate-pulse">In progress...</span>
        {/if}
      </div>
    </div>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
      <div class="text-xs text-slate-500">Cost</div>
      <div class="mt-1 text-sm font-medium text-slate-200">${exec.cost.toFixed(2)}</div>
    </div>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
      <div class="text-xs text-slate-500">Steps</div>
      <div class="mt-1 text-sm font-medium text-slate-200">
        {exec.steps.filter(s => s.status === 'success').length}/{exec.steps.length} complete
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <!-- Timeline -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <h2 class="text-sm font-medium text-slate-300 mb-4">Execution Steps</h2>
      <ExecutionTimeline steps={exec.steps} />
    </div>

    <!-- Live output -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <div class="flex items-center gap-2 mb-4">
        <h2 class="text-sm font-medium text-slate-300">Output</h2>
        {#if exec.status === 'running'}
          <span class="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live
          </span>
        {/if}
      </div>
      <div class="rounded-lg bg-slate-900 border border-slate-700/50 p-4 max-h-96 overflow-y-auto">
        <pre class="text-xs font-mono text-slate-400 whitespace-pre-wrap">{#each exec.liveOutput as line}{line}
{/each}</pre>
      </div>
    </div>
  </div>
</div>
