<script lang="ts">
  import { getSessions } from '../lib/api';
  import { navigate } from '../lib/router';
  import type { Session } from '../lib/types';

  let sessions = $state<Session[]>([]);
  let loading = $state(true);
  let error = $state('');

  $effect(() => {
    loadSessions();
  });

  async function loadSessions() {
    loading = true;
    error = '';
    try {
      sessions = await getSessions();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load sessions';
    } finally {
      loading = false;
    }
  }

  function shortId(id: string): string {
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Sessions</h1>
      <p class="text-sm text-slate-400 mt-1">
        {#if !loading && !error}
          {sessions.length} recording{sessions.length !== 1 ? 's' : ''}
        {:else if error}
          <span class="text-rose-400">Error loading sessions</span>
        {:else}
          Loading...
        {/if}
      </p>
    </div>
    <button
      onclick={loadSessions}
      class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
    >
      Refresh
    </button>
  </div>

  {#if error}
    <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
      <p class="text-sm text-rose-400">{error}</p>
      <p class="text-xs text-slate-500 mt-1">Make sure `mur serve` is running</p>
    </div>
  {/if}

  {#if loading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 animate-pulse">
          <div class="h-3 w-48 rounded bg-slate-700"></div>
          <div class="mt-2 h-3 w-32 rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else if sessions.length > 0}
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-700/50 text-left text-xs text-slate-500">
              <th class="px-4 py-3 font-medium">Session ID</th>
              <th class="px-4 py-3 font-medium">Events</th>
              <th class="px-4 py-3 font-medium">Size</th>
              <th class="px-4 py-3 font-medium">Date</th>
              <th class="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {#each sessions as session}
              <tr
                class="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors cursor-pointer"
                onclick={() => navigate(`/sessions/${session.id}/review`)}
              >
                <td class="px-4 py-3">
                  <span class="font-mono text-emerald-400">{shortId(session.id)}</span>
                </td>
                <td class="px-4 py-3 text-slate-300">{session.event_count}</td>
                <td class="px-4 py-3 text-slate-400">{formatSize(session.file_size)}</td>
                <td class="px-4 py-3 text-slate-400 text-xs">{formatDate(session.modified_at)}</td>
                <td class="px-4 py-3 text-right">
                  <span class="text-xs text-slate-500 hover:text-emerald-400 transition-colors">Review →</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if !error}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p class="text-sm">No session recordings found</p>
      <p class="text-xs mt-1">Use <code class="bg-slate-800 px-1 rounded">mur session start</code> to begin recording</p>
    </div>
  {/if}
</div>
