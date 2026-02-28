<script lang="ts">
  import * as commander from '../lib/commander';
  import type { AuditEntry } from '../lib/commander-types';

  let entries = $state<AuditEntry[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let expandedId = $state<string | null>(null);

  $effect(() => {
    loadAudit();
  });

  async function loadAudit() {
    loading = true;
    error = '';
    try {
      entries = await commander.searchAudit(search.trim() || undefined);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to connect to commander';
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    loadAudit();
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  const decisionColors: Record<string, string> = {
    Allowed: 'text-emerald-400',
    NeedsApproval: 'text-amber-400',
    Blocked: 'text-rose-400',
  };

  const actionTypeIcons: Record<string, string> = {
    Execute: 'E',
    Read: 'R',
    Write: 'W',
    ApiCall: 'A',
    Deploy: 'D',
  };
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Audit Log</h1>
      <p class="text-sm text-slate-400 mt-1">
        {#if !loading && !error}
          {entries.length} entries{search ? ` matching "${search}"` : ''}
        {:else if error}
          <span class="text-rose-400">Disconnected</span>
        {:else}
          Loading...
        {/if}
      </p>
    </div>
    <button
      onclick={loadAudit}
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

  <!-- Search -->
  <div class="flex gap-2">
    <input
      type="text"
      placeholder="Search by workflow ID or action..."
      bind:value={search}
      onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); }}
      class="flex-1 max-w-md rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
    />
    <button
      onclick={handleSearch}
      class="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
    >
      Search
    </button>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 animate-pulse">
          <div class="h-3 w-64 rounded bg-slate-700"></div>
          <div class="mt-2 h-3 w-96 rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else if entries.length > 0}
    <!-- Table-style log -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-700/50 text-left text-xs text-slate-500">
              <th class="px-4 py-3 font-medium">Time</th>
              <th class="px-4 py-3 font-medium">Action</th>
              <th class="px-4 py-3 font-medium">Detail</th>
              <th class="px-4 py-3 font-medium">Decision</th>
              <th class="px-4 py-3 font-medium">Duration</th>
              <th class="px-4 py-3 font-medium">Cost</th>
              <th class="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each entries as entry}
              <tr
                class="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors cursor-pointer"
                onclick={() => expandedId = expandedId === entry.id ? null : entry.id}
              >
                <td class="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{formatTime(entry.timestamp)}</td>
                <td class="px-4 py-2.5">
                  <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    {actionTypeIcons[entry.action_type] || entry.action_type.charAt(0)}&nbsp;{entry.action_type}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-xs text-slate-300 max-w-xs truncate">{entry.action_detail}</td>
                <td class="px-4 py-2.5 text-xs {decisionColors[entry.decision] || 'text-slate-400'}">{entry.decision}</td>
                <td class="px-4 py-2.5 text-xs text-slate-500">{formatDuration(entry.duration_ms)}</td>
                <td class="px-4 py-2.5 text-xs text-slate-500">{entry.cost != null && entry.cost > 0 ? `$${entry.cost.toFixed(4)}` : '-'}</td>
                <td class="px-4 py-2.5">
                  {#if entry.success}
                    <span class="text-xs text-emerald-400">OK</span>
                  {:else}
                    <span class="text-xs text-rose-400">FAIL</span>
                  {/if}
                </td>
              </tr>

              {#if expandedId === entry.id}
                <tr class="bg-slate-900/50">
                  <td colspan="7" class="px-4 py-4">
                    <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                      <div>
                        <span class="text-slate-500">Session:</span>
                        <span class="text-slate-300 ml-1 font-mono">{entry.session_id}</span>
                      </div>
                      {#if entry.workflow_id}
                        <div>
                          <span class="text-slate-500">Workflow:</span>
                          <span class="text-slate-300 ml-1">{entry.workflow_id}</span>
                        </div>
                      {/if}
                      {#if entry.model_used}
                        <div>
                          <span class="text-slate-500">Model:</span>
                          <span class="text-slate-300 ml-1">{entry.model_used}</span>
                        </div>
                      {/if}
                      {#if entry.approved_by}
                        <div>
                          <span class="text-slate-500">Approved by:</span>
                          <span class="text-slate-300 ml-1">{entry.approved_by}</span>
                        </div>
                      {/if}
                      <div class="col-span-2">
                        <span class="text-slate-500">Output:</span>
                        <span class="text-slate-300 ml-1">{entry.output_summary}</span>
                      </div>
                      {#if entry.error}
                        <div class="col-span-2">
                          <span class="text-slate-500">Error:</span>
                          <span class="text-rose-400 ml-1">{entry.error}</span>
                        </div>
                      {/if}
                      <div class="col-span-2 mt-2 pt-2 border-t border-slate-700/30">
                        <span class="text-slate-600">Hash chain:</span>
                        <span class="text-slate-600 ml-1 font-mono text-[10px]">{entry.entry_hash.slice(0, 16)}... &larr; {entry.prev_hash.slice(0, 16)}...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if !error}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <p class="text-sm">No audit entries found</p>
      <p class="text-xs mt-1">{search ? 'Try a different search term' : 'Run a workflow to generate audit entries'}</p>
    </div>
  {/if}
</div>
