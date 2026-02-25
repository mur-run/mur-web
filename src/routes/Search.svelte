<script lang="ts">
  import * as store from '../lib/dataStore';
  import { navigate } from '../lib/router';
  import type { Pattern, Workflow } from '../lib/types';
  import MaturityBadge from '../components/MaturityBadge.svelte';

  interface Props { query: string; }
  let { query }: Props = $props();

  let patterns = $state<Pattern[]>([]);
  let workflows = $state<Workflow[]>([]);

  $effect(() => {
    if (!store.isLoaded()) store.load();
    patterns = store.getPatterns();
    workflows = store.getWorkflows();
    const unsub = store.subscribe(() => {
      patterns = store.getPatterns();
      workflows = store.getWorkflows();
    });
    return unsub;
  });

  const q = $derived(query.toLowerCase());

  const matchedPatterns = $derived(
    patterns.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.triggers.some(t => t.toLowerCase().includes(q)) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 20)
  );

  const matchedWorkflows = $derived(
    workflows.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.steps.some(s => s.toLowerCase().includes(q))
    ).slice(0, 10)
  );

  const total = $derived(matchedPatterns.length + matchedWorkflows.length);
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-slate-100">Search Results</h1>
    <p class="text-sm text-slate-400 mt-1">{total} results for "<span class="text-emerald-400">{query}</span>"</p>
  </div>

  {#if matchedPatterns.length > 0}
    <section>
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Patterns ({matchedPatterns.length})</h2>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {#each matchedPatterns as pattern}
          <a
            href="#/patterns/{pattern.id}"
            class="group rounded-lg border border-slate-700/50 bg-slate-800 p-4 hover:border-slate-600 hover:bg-slate-800/80 transition-all"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">{pattern.id}</h3>
              <MaturityBadge maturity={pattern.maturity} size="sm" />
            </div>
            <p class="text-xs text-slate-400 line-clamp-2">{pattern.description}</p>
            <div class="flex flex-wrap gap-1 mt-2">
              {#each pattern.tags.slice(0, 4) as tag}
                <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{tag}</span>
              {/each}
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  {#if matchedWorkflows.length > 0}
    <section>
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Workflows ({matchedWorkflows.length})</h2>
      <div class="space-y-2">
        {#each matchedWorkflows as wf}
          <button
            onclick={() => navigate('/workflows')}
            class="w-full text-left rounded-lg border border-slate-700/50 bg-slate-800 p-4 hover:border-slate-600 transition-all"
          >
            <h3 class="text-sm font-semibold text-slate-200">{wf.name}</h3>
            <p class="text-xs text-slate-400 mt-0.5">{wf.description}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              {#each wf.steps as step, i}
                <span class="text-[11px] text-slate-500">{i > 0 ? '→ ' : ''}{step}</span>
              {/each}
            </div>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if total === 0}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <p class="text-sm">No results found</p>
      <p class="text-xs mt-1">Try a different search term</p>
    </div>
  {/if}
</div>
