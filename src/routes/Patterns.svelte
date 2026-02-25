<script lang="ts">
  import { navigate } from 'svelte-routing';
  import { getPatterns } from '../lib/api';
  import type { Pattern, Maturity, Tier } from '../lib/types';
  import MaturityBadge from '../components/MaturityBadge.svelte';
  import ConfidenceSlider from '../components/ConfidenceSlider.svelte';

  let allPatterns = $state<Pattern[]>([]);
  let searchQuery = $state('');
  let maturityFilter = $state<Maturity | ''>('');
  let tierFilter = $state<Tier | ''>('');
  let tagFilter = $state('');
  let sortBy = $state<'name' | 'confidence' | 'updated'>('updated');
  let sortDir = $state<'asc' | 'desc'>('desc');

  $effect(() => {
    getPatterns().then(p => allPatterns = p);
  });

  const allTags = $derived(
    [...new Set(allPatterns.flatMap(p => p.tags))].sort()
  );

  const filtered = $derived.by(() => {
    let result = allPatterns.filter(p => !p.archived);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.triggers.some(t => t.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (maturityFilter) {
      result = result.filter(p => p.maturity === maturityFilter);
    }

    if (tierFilter) {
      result = result.filter(p => p.tier === tierFilter);
    }

    if (tagFilter) {
      result = result.filter(p => p.tags.includes(tagFilter));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.id.localeCompare(b.id);
      else if (sortBy === 'confidence') cmp = a.confidence - b.confidence;
      else cmp = new Date(a.stats.updated).getTime() - new Date(b.stats.updated).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  });

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortDir = 'desc';
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Patterns</h1>
      <p class="text-sm text-slate-400 mt-1">{filtered.length} of {allPatterns.filter(p => !p.archived).length} patterns</p>
    </div>
    <button
      onclick={() => navigate('/patterns/new')}
      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
    >
      + New Pattern
    </button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative flex-1 min-w-[200px] max-w-sm">
      <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder="Search patterns..."
        bind:value={searchQuery}
        class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-colors"
      />
    </div>

    <select
      bind:value={maturityFilter}
      class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-500/50 transition-colors"
    >
      <option value="">All Maturity</option>
      <option value="Draft">Draft</option>
      <option value="Emerging">Emerging</option>
      <option value="Stable">Stable</option>
      <option value="Canonical">Canonical</option>
    </select>

    <select
      bind:value={tierFilter}
      class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-500/50 transition-colors"
    >
      <option value="">All Tiers</option>
      <option value="Session">Session</option>
      <option value="Project">Project</option>
      <option value="Global">Global</option>
    </select>

    <select
      bind:value={tagFilter}
      class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-500/50 transition-colors"
    >
      <option value="">All Tags</option>
      {#each allTags as tag}
        <option value={tag}>{tag}</option>
      {/each}
    </select>

    <div class="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
      {#each [{ key: 'name', label: 'Name' }, { key: 'confidence', label: 'Confidence' }, { key: 'updated', label: 'Updated' }] as { key, label }}
        <button
          onclick={() => toggleSort(key as typeof sortBy)}
          class="rounded-md px-2.5 py-1 text-xs transition-colors {sortBy === key ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}"
        >
          {label}
          {#if sortBy === key}
            <span class="ml-0.5">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Pattern grid -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {#each filtered as pattern}
      <a
        href="/patterns/{pattern.id}"
        class="group rounded-lg border border-slate-700/50 bg-slate-800 p-4 hover:border-slate-600 hover:bg-slate-800/80 transition-all"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
            {pattern.id}
          </h3>
          <MaturityBadge maturity={pattern.maturity} size="sm" />
        </div>

        <p class="text-xs text-slate-400 line-clamp-2 mb-3">{pattern.description}</p>

        <div class="mb-3">
          <ConfidenceSlider value={pattern.confidence} readonly />
        </div>

        <div class="flex flex-wrap gap-1">
          {#each pattern.tags.slice(0, 4) as tag}
            <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{tag}</span>
          {/each}
          {#if pattern.tags.length > 4}
            <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-500">+{pattern.tags.length - 4}</span>
          {/if}
        </div>

        <div class="mt-3 flex items-center justify-between text-[10px] text-slate-500">
          <span>{pattern.tier}</span>
          <span>{pattern.stats.injections} injections</span>
        </div>
      </a>
    {/each}
  </div>

  {#if filtered.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <p class="text-sm">No patterns found</p>
      <p class="text-xs mt-1">Try adjusting your filters</p>
    </div>
  {/if}
</div>
