<script lang="ts">
  import { getPipelines, createPipeline, updatePipeline, deletePipeline, runPipeline, runPipelineExpression, validatePipeline, getWorkflows } from '../lib/api';
  import type { Pipeline, PipelineValidation, PipelineRunResult, Workflow } from '../lib/types';
  import { showToast } from '../lib/toast';
  import { t, subscribe as i18nSubscribe } from '../lib/i18n';

  let _i18n = $state(0);

  let pipelines = $state<Pipeline[]>([]);
  let workflows = $state<Workflow[]>([]);
  let showNew = $state(false);
  let editingId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);
  let loading = $state(true);

  // Quick run
  let quickExpr = $state('');
  let quickRunning = $state(false);
  let quickResult = $state<PipelineRunResult | null>(null);
  let quickError = $state('');

  // New form
  let newId = $state('');
  let newExpr = $state('');
  let newDesc = $state('');
  let newValidation = $state<PipelineValidation | null>(null);
  let newValidating = $state(false);

  // Edit form
  let editExpr = $state('');
  let editDesc = $state('');
  let editValidation = $state<PipelineValidation | null>(null);
  let editValidating = $state(false);

  // Run results per pipeline
  let runResults = $state<Record<string, { result?: PipelineRunResult; error?: string; loading: boolean }>>({});

  let validateTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const unsub = i18nSubscribe(() => _i18n++);
    return () => {
      unsub();
      if (validateTimeout) clearTimeout(validateTimeout);
    };
  });

  $effect(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    try {
      const [p, w] = await Promise.all([getPipelines(), getWorkflows()]);
      pipelines = p;
      workflows = w;
    } catch {
      // ignore in demo mode
    }
    loading = false;
  }

  function formatDate(iso?: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // --- Validation (debounced) ---
  function debounceValidate(expression: string, target: 'new' | 'edit') {
    if (validateTimeout) clearTimeout(validateTimeout);
    if (!expression.trim()) {
      if (target === 'new') { newValidation = null; newValidating = false; }
      else { editValidation = null; editValidating = false; }
      return;
    }
    if (target === 'new') newValidating = true;
    else editValidating = true;

    validateTimeout = setTimeout(async () => {
      try {
        const result = await validatePipeline(expression);
        if (target === 'new') newValidation = result;
        else editValidation = result;
      } catch {
        const err = { valid: false, error: 'Validation request failed' };
        if (target === 'new') newValidation = err;
        else editValidation = err;
      }
      if (target === 'new') newValidating = false;
      else editValidating = false;
    }, 500);
  }

  // --- Quick run ---
  async function handleQuickRun() {
    if (!quickExpr.trim()) return;
    quickRunning = true;
    quickResult = null;
    quickError = '';
    try {
      quickResult = await runPipelineExpression(quickExpr.trim());
    } catch (e) {
      quickError = e instanceof Error ? e.message : 'Run failed';
    }
    quickRunning = false;
  }

  // --- Create ---
  async function handleCreate() {
    if (!newExpr.trim()) return;
    try {
      await createPipeline({
        id: newId.trim() || undefined,
        expression: newExpr.trim(),
        description: newDesc.trim(),
      });
      showToast('Pipeline created', 'success');
      newId = ''; newExpr = ''; newDesc = ''; newValidation = null; showNew = false;
      await loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Create failed', 'error');
    }
  }

  // --- Edit ---
  function startEdit(p: Pipeline) {
    editingId = p.id;
    editExpr = p.expression;
    editDesc = p.description;
    editValidation = null;
  }

  async function handleUpdate() {
    if (!editingId || !editExpr.trim()) return;
    try {
      await updatePipeline(editingId, {
        expression: editExpr.trim(),
        description: editDesc.trim(),
      });
      showToast('Pipeline updated', 'success');
      editingId = null;
      await loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  }

  // --- Delete ---
  async function handleDelete(id: string) {
    try {
      await deletePipeline(id);
      showToast('Pipeline deleted', 'success');
      deleteConfirm = null;
      await loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  // --- Run saved pipeline ---
  async function handleRun(id: string) {
    runResults = { ...runResults, [id]: { loading: true } };
    try {
      const result = await runPipeline(id);
      runResults = { ...runResults, [id]: { result, loading: false } };
    } catch (e) {
      runResults = { ...runResults, [id]: { error: e instanceof Error ? e.message : 'Run failed', loading: false } };
    }
  }

  // --- Insert workflow name into expression ---
  function insertWorkflow(name: string, target: 'new' | 'quick') {
    if (target === 'new') {
      newExpr = newExpr ? `${newExpr} | ${name}` : name;
      debounceValidate(newExpr, 'new');
    } else {
      quickExpr = quickExpr ? `${quickExpr} | ${name}` : name;
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">{void _i18n, t('pipelines.title')}</h1>
      <p class="text-sm text-slate-400 mt-1">{pipelines.length} pipelines</p>
    </div>
    <button
      onclick={() => { showNew = !showNew; }}
      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
    >
      {showNew ? t('common.cancel') : '+ New Pipeline'}
    </button>
  </div>

  <!-- Quick run -->
  <div class="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
    <p class="text-xs font-medium text-slate-400 mb-2">Quick Run</p>
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="Type a pipeline expression and press Enter to run"
        bind:value={quickExpr}
        onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleQuickRun(); }}
        class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
      />
      <button
        onclick={handleQuickRun}
        disabled={quickRunning || !quickExpr.trim()}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {#if quickRunning}
          <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        {:else}
          Run
        {/if}
      </button>
    </div>

    <!-- Available workflows (clickable chips) -->
    {#if workflows.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-2">
        {#each workflows as wf}
          <button
            onclick={() => insertWorkflow(wf.name, 'quick')}
            class="inline-flex items-center rounded-full bg-slate-700/40 border border-slate-600/30 px-2.5 py-0.5 text-[11px] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors cursor-pointer"
            title={wf.description}
          >
            {wf.name}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Quick run result -->
    {#if quickResult}
      <div class="mt-3 rounded-lg border p-3 {quickResult.exit_code === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-xs font-medium {quickResult.exit_code === 0 ? 'text-emerald-400' : 'text-red-400'}">
            {quickResult.exit_code === 0 ? 'Success' : `Exit ${quickResult.exit_code}`}
          </span>
          {#if quickResult.duration}
            <span class="text-xs text-slate-500">{quickResult.duration}ms</span>
          {/if}
        </div>
        <pre class="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">{quickResult.output}</pre>
      </div>
    {/if}
    {#if quickError}
      <div class="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
        <p class="text-xs text-red-400">{quickError}</p>
      </div>
    {/if}
  </div>

  <!-- New pipeline form -->
  {#if showNew}
    <div class="rounded-lg border border-emerald-500/30 bg-slate-800 p-5 space-y-4">
      <h2 class="text-sm font-semibold text-emerald-400">New Pipeline</h2>

      <input
        type="text"
        placeholder="Pipeline ID (auto-generated if empty)"
        bind:value={newId}
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
      />

      <div>
        <input
          type="text"
          placeholder="Pipeline expression (e.g. workflow-a | workflow-b)"
          bind:value={newExpr}
          oninput={() => debounceValidate(newExpr, 'new')}
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
        />

        <!-- Validation result -->
        {#if newValidating}
          <p class="text-xs text-slate-500 mt-1">Validating...</p>
        {:else if newValidation}
          {#if newValidation.valid}
            <div class="mt-1">
              <p class="text-xs text-emerald-400">Valid</p>
              {#if newValidation.ast}
                <pre class="text-[10px] text-slate-500 font-mono mt-1 max-h-24 overflow-auto">{JSON.stringify(newValidation.ast, null, 2)}</pre>
              {/if}
            </div>
          {:else}
            <p class="text-xs text-red-400 mt-1">{newValidation.error}</p>
          {/if}
        {/if}
      </div>

      <!-- Available workflows -->
      {#if workflows.length > 0}
        <div>
          <p class="text-xs font-medium text-slate-400 mb-1.5">Available workflows (click to insert)</p>
          <div class="flex flex-wrap gap-1.5">
            {#each workflows as wf}
              <button
                onclick={() => insertWorkflow(wf.name, 'new')}
                class="inline-flex items-center rounded-full bg-slate-700/40 border border-slate-600/30 px-2.5 py-0.5 text-[11px] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors cursor-pointer"
                title={wf.description}
              >
                {wf.name}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <textarea
        placeholder="Description (optional)"
        bind:value={newDesc}
        rows="2"
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors resize-none"
      ></textarea>

      <button
        onclick={handleCreate}
        disabled={!newExpr.trim()}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        Create Pipeline
      </button>
    </div>
  {/if}

  <!-- Loading -->
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <span class="inline-block w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></span>
    </div>
  {/if}

  <!-- Pipeline list -->
  <div class="space-y-3">
    {#each pipelines as p}
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 transition-all hover:border-slate-600">
        <!-- Header row -->
        <div class="flex items-center justify-between p-4">
          <button
            onclick={() => editingId === p.id ? (editingId = null) : startEdit(p)}
            class="flex-1 text-left"
          >
            <div class="flex items-center gap-3">
              <svg class="h-5 w-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <div>
                <h3 class="text-sm font-semibold text-slate-200">{p.id}</h3>
                <p class="text-xs text-slate-400 mt-0.5 font-mono">{p.expression}</p>
                {#if p.description}
                  <p class="text-xs text-slate-500 mt-0.5">{p.description}</p>
                {/if}
              </div>
            </div>
          </button>
          <div class="flex items-center gap-3 ml-4">
            <span class="text-xs text-slate-500">{formatDate(p.created)}</span>
            <!-- Run button -->
            <button
              onclick={() => handleRun(p.id)}
              disabled={runResults[p.id]?.loading}
              class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
              title="Run pipeline"
            >
              {#if runResults[p.id]?.loading}
                <span class="inline-block w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></span>
              {:else}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              {/if}
            </button>
            {#if deleteConfirm === p.id}
              <button onclick={() => handleDelete(p.id)} class="text-xs text-red-400 hover:text-red-300 font-medium">{t('common.confirm')}</button>
              <button onclick={() => deleteConfirm = null} class="text-xs text-slate-500 hover:text-slate-300">{t('common.cancel')}</button>
            {:else}
              <button onclick={() => editingId === p.id ? (editingId = null) : startEdit(p)} class="text-xs text-slate-500 hover:text-emerald-400 transition-colors" title="Edit">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onclick={() => deleteConfirm = p.id} class="text-xs text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            {/if}
          </div>
        </div>

        <!-- Run result -->
        {#if runResults[p.id] && !runResults[p.id].loading}
          <div class="border-t border-slate-700/30 px-4 py-3">
            {#if runResults[p.id].result}
              {@const res = runResults[p.id].result!}
              <div class="rounded-lg border p-3 {res.exit_code === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-xs font-medium {res.exit_code === 0 ? 'text-emerald-400' : 'text-red-400'}">
                    {res.exit_code === 0 ? 'Success' : `Exit ${res.exit_code}`}
                  </span>
                  {#if res.duration}
                    <span class="text-xs text-slate-500">{res.duration}ms</span>
                  {/if}
                  <button onclick={() => { const copy = { ...runResults }; delete copy[p.id]; runResults = copy; }} class="ml-auto text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
                </div>
                <pre class="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">{res.output}</pre>
              </div>
            {:else if runResults[p.id].error}
              <div class="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <p class="text-xs text-red-400">{runResults[p.id].error}</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Expanded edit view -->
        {#if editingId === p.id}
          <div class="border-t border-slate-700/50 p-4 space-y-4">
            <div>
              <input
                type="text"
                bind:value={editExpr}
                oninput={() => debounceValidate(editExpr, 'edit')}
                placeholder="Pipeline expression"
                class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
              />

              {#if editValidating}
                <p class="text-xs text-slate-500 mt-1">Validating...</p>
              {:else if editValidation}
                {#if editValidation.valid}
                  <div class="mt-1">
                    <p class="text-xs text-emerald-400">Valid</p>
                    {#if editValidation.ast}
                      <pre class="text-[10px] text-slate-500 font-mono mt-1 max-h-24 overflow-auto">{JSON.stringify(editValidation.ast, null, 2)}</pre>
                    {/if}
                  </div>
                {:else}
                  <p class="text-xs text-red-400 mt-1">{editValidation.error}</p>
                {/if}
              {/if}
            </div>

            <textarea
              bind:value={editDesc}
              rows="2"
              placeholder="Description"
              class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors resize-none"
            ></textarea>

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
        {/if}
      </div>
    {/each}
  </div>

  <!-- Empty state -->
  {#if !loading && pipelines.length === 0 && !showNew}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <p class="text-sm">No pipelines yet</p>
      <p class="text-xs mt-1">Create one to chain workflows together</p>
    </div>
  {/if}
</div>
