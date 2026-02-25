<script lang="ts">
  import { getDashboardStats, getPatterns } from '../lib/api';
  import type { DashboardStats, Pattern, Maturity } from '../lib/types';
  import MaturityBadge from '../components/MaturityBadge.svelte';
  import ConfidenceSlider from '../components/ConfidenceSlider.svelte';
  import ConfidenceChart from '../components/ConfidenceChart.svelte';
  import ActivityTimeline from '../components/ActivityTimeline.svelte';

  let stats = $state<DashboardStats | null>(null);
  let allPatterns = $state<Pattern[]>([]);
  let decayWarnings = $state<Pattern[]>([]);
  let recentPatterns = $state<Pattern[]>([]);

  $effect(() => {
    loadData();
  });

  async function loadData() {
    const [s, patterns] = await Promise.all([getDashboardStats(), getPatterns()]);
    stats = s;
    allPatterns = patterns.filter(p => !p.archived);
    decayWarnings = patterns.filter(p => !p.archived && p.confidence < 0.5).sort((a, b) => a.confidence - b.confidence);
    recentPatterns = [...patterns].sort((a, b) => new Date(b.stats.updated).getTime() - new Date(a.stats.updated).getTime()).slice(0, 5);
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const maturityOrder: Maturity[] = ['Draft', 'Emerging', 'Stable', 'Canonical'];
  const maturityColors: Record<Maturity, string> = {
    Draft: 'bg-slate-500',
    Emerging: 'bg-amber-500',
    Stable: 'bg-emerald-500',
    Canonical: 'bg-purple-500',
  };
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-slate-100">Dashboard</h1>
    <p class="text-sm text-slate-400 mt-1">Overview of your learning patterns</p>
  </div>

  {#if stats}
    <!-- Stats cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <div class="text-sm text-slate-400">Total Patterns</div>
        <div class="mt-2 text-3xl font-bold text-slate-100">{stats.totalPatterns}</div>
        <div class="mt-1 text-xs text-slate-500">{stats.activePatterns} active</div>
      </div>
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <div class="text-sm text-slate-400">Workflows</div>
        <div class="mt-2 text-3xl font-bold text-slate-100">{stats.totalWorkflows}</div>
        <div class="mt-1 text-xs text-slate-500">automated flows</div>
      </div>
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <div class="text-sm text-slate-400">Avg Confidence</div>
        <div class="mt-2 text-3xl font-bold {stats.avgConfidence >= 0.7 ? 'text-emerald-400' : stats.avgConfidence >= 0.5 ? 'text-amber-400' : 'text-rose-400'}">
          {(stats.avgConfidence * 100).toFixed(0)}%
        </div>
        <div class="mt-1 text-xs text-slate-500">across active patterns</div>
      </div>
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <div class="text-sm text-slate-400">Decay Warnings</div>
        <div class="mt-2 text-3xl font-bold {decayWarnings.length > 0 ? 'text-amber-400' : 'text-emerald-400'}">
          {decayWarnings.length}
        </div>
        <div class="mt-1 text-xs text-slate-500">below 50% confidence</div>
      </div>
    </div>

    <!-- Maturity distribution -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
      <h2 class="text-sm font-medium text-slate-300 mb-4">Maturity Distribution</h2>
      <div class="flex h-8 overflow-hidden rounded-lg bg-slate-700/50">
        {#each maturityOrder as m}
          {@const count = stats.maturityDistribution[m]}
          {@const pct = stats.activePatterns > 0 ? (count / stats.activePatterns) * 100 : 0}
          {#if pct > 0}
            <div
              class="{maturityColors[m]} flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
              style="width: {pct}%"
              title="{m}: {count}"
            >
              {#if pct > 10}{m} ({count}){/if}
            </div>
          {/if}
        {/each}
      </div>
      <div class="mt-3 flex flex-wrap gap-4">
        {#each maturityOrder as m}
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <div class="h-2.5 w-2.5 rounded-sm {maturityColors[m]}"></div>
            {m}: {stats.maturityDistribution[m]}
          </div>
        {/each}
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <h2 class="text-sm font-medium text-slate-300 mb-3">Confidence Distribution</h2>
        <ConfidenceChart patterns={allPatterns} />
      </div>
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <h2 class="text-sm font-medium text-slate-300 mb-3">Activity (Last 30 Days)</h2>
        <ActivityTimeline patterns={allPatterns} />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Recent activity -->
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-slate-300">Recent Activity</h2>
          <a href="#/patterns" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">View all</a>
        </div>
        <div class="space-y-3">
          {#each recentPatterns as pattern}
            <a href="#/patterns/{pattern.id}" class="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-slate-700/30 transition-colors">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-200 truncate">{pattern.id}</span>
                  <MaturityBadge maturity={pattern.maturity} size="sm" />
                </div>
                <p class="text-xs text-slate-500 truncate mt-0.5">{pattern.description}</p>
              </div>
              <span class="text-xs text-slate-500 shrink-0">{formatDate(pattern.stats.updated)}</span>
            </a>
          {/each}
        </div>
      </div>

      <!-- Decay warnings -->
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6">
        <h2 class="text-sm font-medium text-slate-300 mb-4">
          Decay Warnings
          {#if decayWarnings.length > 0}
            <span class="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">{decayWarnings.length}</span>
          {/if}
        </h2>
        {#if decayWarnings.length === 0}
          <div class="flex items-center justify-center py-8 text-sm text-slate-500">
            All patterns above 50% confidence
          </div>
        {:else}
          <div class="space-y-3">
            {#each decayWarnings as pattern}
              <a href="#/patterns/{pattern.id}" class="block rounded-lg p-3 -mx-1 hover:bg-slate-700/30 transition-colors">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-slate-200">{pattern.id}</span>
                  <span class="text-xs text-slate-500">{formatDate(pattern.stats.last_used)}</span>
                </div>
                <ConfidenceSlider value={pattern.confidence} readonly />
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Loading skeleton -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each Array(4) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-6 animate-pulse">
          <div class="h-3 w-20 rounded bg-slate-700"></div>
          <div class="mt-3 h-8 w-12 rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {/if}
</div>
