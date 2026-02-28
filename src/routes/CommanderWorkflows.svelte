<script lang="ts">
  import { navigate } from '../lib/router';
  import * as commander from '../lib/commander';
  import type { CommanderWorkflow } from '../lib/commander-types';
  import { showToast } from '../lib/toast';

  let workflows = $state<CommanderWorkflow[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let runningId = $state<string | null>(null);

  $effect(() => {
    loadWorkflows();
  });

  async function loadWorkflows() {
    loading = true;
    error = '';
    try {
      workflows = await commander.getWorkflows();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to connect to commander';
    } finally {
      loading = false;
    }
  }

  async function handleRun(wf: CommanderWorkflow, shadow: boolean) {
    runningId = wf.id;
    try {
      const result = await commander.runWorkflow(wf.id, { shadow });
      if (result.success) {
        showToast(`Workflow "${wf.name}" ${shadow ? '(dry-run)' : ''} completed`, 'success');
      } else {
        showToast(`Workflow "${wf.name}" failed: ${result.error || 'unknown error'}`, 'error');
      }
    } catch (e) {
      showToast(`Run failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error');
    } finally {
      runningId = null;
    }
  }

  const filtered = $derived(
    search.trim()
      ? workflows.filter(w =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.description.toLowerCase().includes(search.toLowerCase())
        )
      : workflows
  );

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const stepTypeColors: Record<string, string> = {
    Execute: 'bg-blue-500/20 text-blue-400',
    Analyze: 'bg-purple-500/20 text-purple-400',
    Code: 'bg-emerald-500/20 text-emerald-400',
    Refactor: 'bg-amber-500/20 text-amber-400',
    Fix: 'bg-rose-500/20 text-rose-400',
    Review: 'bg-cyan-500/20 text-cyan-400',
    Test: 'bg-indigo-500/20 text-indigo-400',
    Deploy: 'bg-orange-500/20 text-orange-400',
  };
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Commander Workflows</h1>
      <p class="text-sm text-slate-400 mt-1">
        {#if !loading && !error}
          {workflows.length} workflows on commander
        {:else if error}
          <span class="text-rose-400">Disconnected</span>
        {:else}
          Loading...
        {/if}
      </p>
    </div>
    <button
      onclick={loadWorkflows}
      class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
    >
      Refresh
    </button>
  </div>

  {#if error}
    <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
      <p class="text-sm text-rose-400">{error}</p>
      <p class="text-xs text-slate-500 mt-1">Make sure mur-commander is running on localhost:3939</p>
    </div>
  {/if}

  {#if !loading && !error && workflows.length > 3}
    <input
      type="text"
      placeholder="Filter workflows..."
      bind:value={search}
      class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
    />
  {/if}

  {#if loading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6 animate-pulse">
          <div class="h-4 w-48 rounded bg-slate-700"></div>
          <div class="mt-2 h-3 w-72 rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="space-y-3">
      {#each filtered as wf}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 transition-all hover:border-slate-600">
          <div class="p-4">
            <div class="flex items-start justify-between gap-4">
              <button
                onclick={() => navigate(`/commander/workflows/${encodeURIComponent(wf.id)}`)}
                class="flex-1 text-left"
              >
                <h3 class="text-sm font-semibold text-slate-200">{wf.name}</h3>
                <p class="text-xs text-slate-400 mt-0.5">{wf.description}</p>
              </button>
              <div class="flex items-center gap-2 shrink-0">
                {#if wf.schedule}
                  <span class="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-400" title="Scheduled: {wf.schedule}">cron</span>
                {/if}
                <span class="text-xs text-slate-500">{wf.steps.length} steps</span>
                <button
                  onclick={() => handleRun(wf, true)}
                  disabled={runningId === wf.id}
                  class="rounded bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Dry run (shadow mode)"
                >
                  {runningId === wf.id ? 'Running...' : 'Dry Run'}
                </button>
                <button
                  onclick={() => handleRun(wf, false)}
                  disabled={runningId === wf.id}
                  class="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  Run
                </button>
              </div>
            </div>

            {#if Object.keys(wf.variables).length > 0}
              <div class="mt-2 flex flex-wrap gap-1.5">
                {#each Object.entries(wf.variables) as [key, val]}
                  <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">{key}={val}</span>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Steps preview -->
          <div class="border-t border-slate-700/30 px-4 py-2.5">
            <div class="flex flex-wrap gap-2">
              {#each wf.steps as step, i}
                <span class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] {stepTypeColors[step.step_type] || 'bg-slate-700/40 text-slate-400'}">
                  <span class="font-medium">{i + 1}.</span> {step.name}
                  {#if step.breakpoint}
                    <span class="text-amber-400" title="Breakpoint: {step.breakpoint_message || ''}">||</span>
                  {/if}
                </span>
                {#if i < wf.steps.length - 1}
                  <span class="text-slate-600 text-xs self-center">&rarr;</span>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if !loading && !error && workflows.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a9 9 0 0 1-9 9" />
      </svg>
      <p class="text-sm">No commander workflows found</p>
      <p class="text-xs mt-1">Create workflows in ~/.mur/workflows/ to get started</p>
    </div>
  {/if}
</div>
