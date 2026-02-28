<script lang="ts">
  import { navigate } from '../lib/router';
  import * as commander from '../lib/commander';
  import type { CommanderWorkflow, ExecutionResult } from '../lib/commander-types';
  import { showToast } from '../lib/toast';

  interface Props {
    id: string;
  }

  let { id }: Props = $props();

  let workflow = $state<CommanderWorkflow | null>(null);
  let loading = $state(true);
  let error = $state('');
  let running = $state(false);
  let lastResult = $state<ExecutionResult | null>(null);

  // Variable overrides for execution
  let varOverrides = $state<Record<string, string>>({});

  $effect(() => {
    loadWorkflow();
  });

  async function loadWorkflow() {
    loading = true;
    error = '';
    try {
      const all = await commander.getWorkflows();
      workflow = all.find(w => w.id === id || w.name === decodeURIComponent(id)) || null;
      if (!workflow) {
        error = `Workflow "${id}" not found`;
      } else {
        // Initialize var overrides from workflow defaults
        varOverrides = { ...workflow.variables };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load workflow';
    } finally {
      loading = false;
    }
  }

  async function handleRun(shadow: boolean) {
    if (!workflow) return;
    running = true;
    lastResult = null;
    try {
      const result = await commander.runWorkflow(workflow.id, {
        shadow,
        vars: Object.keys(varOverrides).length > 0 ? varOverrides : undefined,
      });
      lastResult = result;
      if (result.success) {
        showToast(`Workflow completed${shadow ? ' (dry-run)' : ''}`, 'success');
      } else {
        showToast(`Workflow failed: ${result.error || 'unknown'}`, 'error');
      }
    } catch (e) {
      showToast(`Execution failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error');
    } finally {
      running = false;
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  const stepTypeColors: Record<string, string> = {
    Execute: 'border-blue-500/50 bg-blue-500/10',
    Analyze: 'border-purple-500/50 bg-purple-500/10',
    Code: 'border-emerald-500/50 bg-emerald-500/10',
    Refactor: 'border-amber-500/50 bg-amber-500/10',
    Fix: 'border-rose-500/50 bg-rose-500/10',
    Review: 'border-cyan-500/50 bg-cyan-500/10',
    Test: 'border-indigo-500/50 bg-indigo-500/10',
    Deploy: 'border-orange-500/50 bg-orange-500/10',
  };

  const failureIcons: Record<string, string> = {
    Abort: 'Stop',
    Skip: 'Skip',
    Retry: 'Retry',
    AutoFix: 'AutoFix',
  };
</script>

<div class="space-y-6">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-2 text-sm">
    <button onclick={() => navigate('/commander/workflows')} class="text-slate-400 hover:text-emerald-400 transition-colors">
      Commander Workflows
    </button>
    <span class="text-slate-600">/</span>
    <span class="text-slate-200">{workflow?.name || id}</span>
  </div>

  {#if loading}
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6 animate-pulse">
      <div class="h-6 w-48 rounded bg-slate-700"></div>
      <div class="mt-3 h-4 w-96 rounded bg-slate-700"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
      <p class="text-sm text-rose-400">{error}</p>
    </div>
  {:else if workflow}
    <!-- Header -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">{workflow.name}</h1>
          <p class="text-sm text-slate-400 mt-1">{workflow.description}</p>
          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>{workflow.steps.length} steps</span>
            {#if workflow.schedule}
              <span class="text-indigo-400">Schedule: {workflow.schedule}</span>
            {/if}
            <span>Created {formatDate(workflow.created_at)}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            onclick={() => handleRun(true)}
            disabled={running}
            class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {running ? 'Running...' : 'Dry Run'}
          </button>
          <button
            onclick={() => handleRun(false)}
            disabled={running}
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {running ? 'Running...' : 'Execute'}
          </button>
        </div>
      </div>
    </div>

    <!-- Variables -->
    {#if Object.keys(workflow.variables).length > 0}
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <h2 class="text-sm font-medium text-slate-300 mb-3">Variables</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each Object.entries(workflow.variables) as [key, defaultVal]}
            <div>
              <span class="block text-xs text-slate-400 mb-1 font-mono">{key}</span>
              <input
                type="text"
                aria-label={key}
                value={varOverrides[key] ?? defaultVal}
                oninput={(e: Event) => varOverrides[key] = (e.target as HTMLInputElement).value}
                class="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 font-mono outline-none focus:border-emerald-500/50 transition-colors"
                placeholder={defaultVal}
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Steps -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <h2 class="text-sm font-medium text-slate-300 mb-4">Steps</h2>
      <div class="space-y-3">
        {#each workflow.steps as step, i}
          <div class="rounded-lg border p-4 {stepTypeColors[step.step_type] || 'border-slate-700/50 bg-slate-900/50'}">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/50 text-xs font-medium text-slate-300">{i + 1}</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-slate-200">{step.name}</span>
                    <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{step.step_type}</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-1 font-mono break-all">{step.action}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-500 shrink-0 ml-4">
                <span title="On failure: {step.on_failure}">{failureIcons[step.on_failure] || step.on_failure}</span>
                {#if step.breakpoint}
                  <span class="text-amber-400" title={step.breakpoint_message || 'Breakpoint'}>BP</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Execution Result -->
    {#if lastResult}
      <div class="rounded-lg border {lastResult.success ? 'border-emerald-500/30' : 'border-rose-500/30'} bg-slate-800 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium {lastResult.success ? 'text-emerald-400' : 'text-rose-400'}">
            {lastResult.success ? 'Execution Succeeded' : 'Execution Failed'}
            {#if lastResult.shadow}
              <span class="ml-2 text-xs text-slate-500">(dry run)</span>
            {/if}
          </h2>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>{lastResult.steps_completed}/{lastResult.steps_total} steps</span>
            <span>{formatDuration(lastResult.duration_ms)}</span>
            {#if lastResult.total_cost > 0}
              <span>${lastResult.total_cost.toFixed(4)}</span>
            {/if}
          </div>
        </div>

        {#if lastResult.error}
          <div class="rounded bg-rose-950/30 p-3 mb-4 text-sm text-rose-400">{lastResult.error}</div>
        {/if}

        {#if lastResult.step_results.length > 0}
          <div class="space-y-2">
            {#each lastResult.step_results as sr}
              <div class="flex items-center gap-3 rounded bg-slate-900/50 px-3 py-2 text-xs">
                <span class="{sr.success ? 'text-emerald-400' : 'text-rose-400'}">{sr.success ? 'OK' : 'FAIL'}</span>
                <span class="text-slate-300 font-medium">{sr.step_name}</span>
                <span class="text-slate-500 flex-1 truncate font-mono">{sr.output}</span>
                <span class="text-slate-500 shrink-0">{formatDuration(sr.duration_ms)}</span>
                {#if sr.cost > 0}
                  <span class="text-slate-500 shrink-0">${sr.cost.toFixed(4)}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
