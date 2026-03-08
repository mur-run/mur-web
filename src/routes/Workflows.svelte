<script lang="ts">
  import * as store from '../lib/dataStore';
  import { searchWorkflows, type WorkflowSearchResult } from '../lib/api';
  import type { Workflow, WorkflowVariable } from '../lib/types';
  import { t, subscribe as i18nSubscribe } from '../lib/i18n';

  let _i18n = $state(0);
  $effect(() => {
    const unsub = i18nSubscribe(() => _i18n++);
    return () => {
      unsub();
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  });

  let workflows = $state<Workflow[]>([]);
  let showNew = $state(false);
  let editingId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  // Search & pagination
  let searchQuery = $state('');
  let currentPage = $state(1);
  let searchMode = $state<'keyword' | 'semantic'>('keyword');
  let semanticResults = $state<string[]>([]); // workflow names from semantic search
  let searching = $state(false);
  const perPage = 10;

  const filtered = $derived.by(() => {
    if (!searchQuery) return workflows;
    if (searchMode === 'semantic' && semanticResults.length > 0) {
      // Order by semantic ranking
      return semanticResults
        .map(name => workflows.find(w => w.id === name || w.name === name))
        .filter((w): w is Workflow => !!w);
    }
    // Keyword fallback
    const q = searchQuery.toLowerCase();
    return workflows.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      (w.tools || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / perPage)));
  const paged = $derived(filtered.slice((currentPage - 1) * perPage, currentPage * perPage));

  // Reset page when search changes
  $effect(() => {
    searchQuery;
    currentPage = 1;
  });

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  function onSearchInput() {
    // Instant keyword filter
    searchMode = 'keyword';
    semanticResults = [];

    // Debounced semantic search (500ms after stop typing)
    if (searchTimeout) clearTimeout(searchTimeout);
    if (searchQuery.trim().length >= 2) {
      searchTimeout = setTimeout(async () => {
        searching = true;
        try {
          const results = await searchWorkflows(searchQuery.trim());
          if (results.length > 0) {
            semanticResults = results.map(r => r.name);
            searchMode = 'semantic';
          }
        } catch { /* ignore */ }
        searching = false;
      }, 500);
    }
  }

  // New workflow form
  let newName = $state('');
  let newDesc = $state('');
  let newSteps = $state<string[]>(['']);

  // Edit form
  let editName = $state('');
  let editDesc = $state('');
  let editSteps = $state<string[]>([]);
  let editTools = $state<string[]>([]);
  let editVariables = $state<WorkflowVariable[]>([]);

  const varTypes = ['string', 'url', 'path', 'number', 'bool', 'array'] as const;

  $effect(() => {
    if (!store.isLoaded()) store.load();
    workflows = store.getWorkflows();
    const unsub = store.subscribe(() => { workflows = store.getWorkflows(); });
    return unsub;
  });

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // --- New workflow ---
  function addNewStep() { newSteps = [...newSteps, '']; }
  function removeNewStep(i: number) { newSteps = newSteps.filter((_, idx) => idx !== i); }
  function moveNewStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= newSteps.length) return;
    const copy = [...newSteps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    newSteps = copy;
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    await store.createWorkflow({
      name: newName.trim(),
      description: newDesc.trim(),
      steps: newSteps.filter(s => s.trim()),
    });
    newName = ''; newDesc = ''; newSteps = ['']; showNew = false;
  }

  // --- Edit workflow ---
  function startEdit(wf: Workflow) {
    editingId = wf.id;
    editName = wf.name;
    editDesc = wf.description;
    editSteps = [...wf.steps];
    editTools = [...(wf.tools || [])];
    editVariables = (wf.variables || []).map(v => ({ ...v }));
  }

  function addEditVariable() {
    editVariables = [...editVariables, { name: '', type: 'string', required: false, default_value: '', description: '' }];
  }
  function removeEditVariable(i: number) {
    editVariables = editVariables.filter((_, idx) => idx !== i);
  }

  function addEditStep() { editSteps = [...editSteps, '']; }
  function removeEditStep(i: number) { editSteps = editSteps.filter((_, idx) => idx !== i); }
  function moveEditStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= editSteps.length) return;
    const copy = [...editSteps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    editSteps = copy;
  }

  async function handleUpdate() {
    if (!editingId || !editName.trim()) return;
    await store.updateWorkflow(editingId, {
      name: editName.trim(),
      description: editDesc.trim(),
      steps: editSteps.filter(s => s.trim()),
      tools: editTools,
      variables: editVariables.filter(v => v.name.trim()),
    });
    editingId = null;
  }

  async function handleDelete(id: string) {
    await store.deleteWorkflow(id);
    deleteConfirm = null;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">{void _i18n, t('workflows.title')}</h1>
      <p class="text-sm text-slate-400 mt-1">{t('workflows.count', { filtered: filtered.length, total: workflows.length })}</p>
    </div>
    <button
      onclick={() => { showNew = !showNew; }}
      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
    >
      {showNew ? t('common.cancel') : t('workflows.new')}
    </button>
  </div>

  <!-- Search -->
  <div class="relative">
    <svg class="absolute left-3 top-2.5 h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    <input
      type="text"
      placeholder={t('workflows.searchPlaceholder')}
      bind:value={searchQuery}
      oninput={onSearchInput}
      class="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-20 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
    />
    {#if searchQuery}
      <span class="absolute right-3 top-2.5 text-[10px] text-slate-500">
        {#if searching}
          {t('common.searching')}
        {:else if searchMode === 'semantic'}
          {t('common.semantic')}
        {:else}
          {t('common.keyword')}
        {/if}
      </span>
    {/if}
  </div>

  <!-- New workflow form -->
  {#if showNew}
    <div class="rounded-lg border border-emerald-500/30 bg-slate-800 p-5 space-y-4">
      <h2 class="text-sm font-semibold text-emerald-400">{t('workflows.newTitle')}</h2>
      <input
        type="text"
        placeholder={t('workflows.namePlaceholder')}
        bind:value={newName}
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
      />
      <textarea
        placeholder={t('workflows.descPlaceholder')}
        bind:value={newDesc}
        rows="2"
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors resize-none"
      ></textarea>

      <div class="space-y-2">
        <p class="text-xs font-medium text-slate-400">{ t('common.steps') }</p>
        {#each newSteps as step, i}
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 w-5 text-right">{i + 1}.</span>
            <input
              type="text"
              placeholder={t('workflows.stepPlaceholder')}
              bind:value={newSteps[i]}
              class="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button onclick={() => moveNewStep(i, -1)} disabled={i === 0} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move up">↑</button>
            <button onclick={() => moveNewStep(i, 1)} disabled={i === newSteps.length - 1} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move down">↓</button>
            <button onclick={() => removeNewStep(i)} class="text-red-400 hover:text-red-300 transition-colors" title="Remove">×</button>
          </div>
        {/each}
        <button onclick={addNewStep} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('workflows.addStep')}</button>
      </div>

      <button
        onclick={handleCreate}
        disabled={!newName.trim()}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {t('workflows.create')}
      </button>
    </div>
  {/if}

  <!-- Workflow list -->
  <div class="space-y-3">
    {#each paged as wf}
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 transition-all hover:border-slate-600">
        <!-- Header row -->
        <div class="flex items-center justify-between p-4">
          <button
            onclick={() => editingId === wf.id ? (editingId = null) : startEdit(wf)}
            class="flex-1 text-left"
          >
            <div class="flex items-center gap-3">
              <svg class="h-5 w-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a9 9 0 0 1-9 9" />
              </svg>
              <div>
                <h3 class="text-sm font-semibold text-slate-200">{wf.name}</h3>
                <p class="text-xs text-slate-400 mt-0.5">{wf.description}</p>
              </div>
            </div>
          </button>
          <div class="flex items-center gap-4 ml-4">
            <span class="text-xs text-slate-500">{wf.steps.length} steps</span>
            <span class="text-xs text-slate-500">{formatDate(wf.updated)}</span>
            {#if deleteConfirm === wf.id}
              <button onclick={() => handleDelete(wf.id)} class="text-xs text-red-400 hover:text-red-300 font-medium">{t('common.confirm')}</button>
              <button onclick={() => deleteConfirm = null} class="text-xs text-slate-500 hover:text-slate-300">{t('common.cancel')}</button>
            {:else}
              <button onclick={() => editingId === wf.id ? (editingId = null) : startEdit(wf)} class="text-xs text-slate-500 hover:text-emerald-400 transition-colors" title="Edit">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onclick={() => deleteConfirm = wf.id} class="text-xs text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            {/if}
          </div>
        </div>

        <!-- Expanded edit view -->
        {#if editingId === wf.id}
          <div class="border-t border-slate-700/50 p-4 space-y-4">
            <input
              type="text"
              bind:value={editName}
              class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
            />
            <textarea
              bind:value={editDesc}
              rows="2"
              class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors resize-none"
            ></textarea>

            <!-- Tools -->
            {#if editTools.length > 0}
              <div>
                <p class="text-xs font-medium text-slate-400 mb-2">Tools</p>
                <div class="flex flex-wrap gap-2">
                  {#each editTools as tool}
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                      🔧 {tool}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Variables -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-medium text-slate-400">Variables ({editVariables.length})</p>
                <button onclick={addEditVariable} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">+ Add variable</button>
              </div>
              {#if editVariables.length > 0}
                <div class="space-y-2">
                  {#each editVariables as variable, i}
                    <div class="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 flex items-center gap-2 flex-wrap">
                      <input type="text" placeholder="name" bind:value={editVariables[i].name}
                        class="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition-colors" />
                      <select bind:value={editVariables[i].type}
                        class="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-300 outline-none focus:border-emerald-500/50">
                        {#each varTypes as vt}<option value={vt}>{vt}</option>{/each}
                      </select>
                      <input type="text" placeholder="default" bind:value={editVariables[i].default_value}
                        class="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition-colors" />
                      <input type="text" placeholder="description" bind:value={editVariables[i].description}
                        class="flex-1 min-w-[120px] rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition-colors" />
                      <label class="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer whitespace-nowrap">
                        <input type="checkbox" bind:checked={editVariables[i].required}
                          class="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 h-3 w-3" />
                        required
                      </label>
                      <button onclick={() => removeEditVariable(i)} class="text-red-400 hover:text-red-300 transition-colors text-xs">×</button>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-xs text-slate-600 italic">{t('workflows.noVariablesShort')}</p>
              {/if}
            </div>

            <!-- Steps -->
            <div class="space-y-2">
              <p class="text-xs font-medium text-slate-400">{ t('common.steps') }</p>
              {#each editSteps as step, i}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 w-5 text-right">{i + 1}.</span>
                  <input
                    type="text"
                    bind:value={editSteps[i]}
                    class="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <button onclick={() => moveEditStep(i, -1)} disabled={i === 0} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">↑</button>
                  <button onclick={() => moveEditStep(i, 1)} disabled={i === editSteps.length - 1} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">↓</button>
                  <button onclick={() => removeEditStep(i)} class="text-red-400 hover:text-red-300 transition-colors">×</button>
                </div>
              {/each}
              <button onclick={addEditStep} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('workflows.addStep')}</button>
            </div>

            <div class="flex gap-2">
              <button
                onclick={handleUpdate}
                class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                {t('workflows.saveChanges')}
              </button>
              <button
                onclick={() => editingId = null}
                class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        {:else}
          <!-- Collapsed step preview -->
          <div class="border-t border-slate-700/30 px-4 py-2.5">
            <div class="flex flex-wrap gap-2">
              {#each wf.steps as step, i}
                <span class="inline-flex items-center gap-1 rounded bg-slate-700/40 px-2 py-0.5 text-[11px] text-slate-400">
                  <span class="text-emerald-500">{i + 1}</span> {step.length > 30 ? step.slice(0, 30) + '…' : step}
                </span>
                {#if i < wf.steps.length - 1}
                  <span class="text-slate-600 text-xs">→</span>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex items-center justify-center gap-2 pt-2">
      <button
        onclick={() => currentPage = Math.max(1, currentPage - 1)}
        disabled={currentPage === 1}
        class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 transition-colors"
      >
        {t('common.prev')}
      </button>
      {#each Array(totalPages) as _, i}
        <button
          onclick={() => currentPage = i + 1}
          class="rounded-lg px-3 py-1.5 text-xs transition-colors {currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
        >
          {i + 1}
        </button>
      {/each}
      <button
        onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
        disabled={currentPage === totalPages}
        class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 transition-colors"
      >
        {t('common.next')}
      </button>
    </div>
  {/if}

  {#if filtered.length === 0 && searchQuery}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <p class="text-sm">{t('workflows.noMatch', { query: searchQuery })}</p>
      <p class="text-xs mt-1">{t('workflows.noMatchHint')}</p>
    </div>
  {:else if workflows.length === 0 && !showNew}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a9 9 0 0 1-9 9" />
      </svg>
      <p class="text-sm">{t('workflows.noWorkflows')}</p>
      <p class="text-xs mt-1">{t('workflows.noWorkflowsHint')}</p>
    </div>
  {/if}
</div>
