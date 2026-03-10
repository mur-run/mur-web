<script lang="ts">
  import { getPipelines, createPipeline, updatePipeline, deletePipeline, runPipeline, runPipelineExpression, validatePipeline, getWorkflows } from '../lib/api';
  import type { Pipeline, PipelineValidation, PipelineRunResult, Workflow, PipelineOperator } from '../lib/types';
  import { showToast } from '../lib/toast';
  import { t, subscribe as i18nSubscribe } from '../lib/i18n';

  let _i18n = $state(0);

  // --- Core data ---
  let pipelines = $state<Pipeline[]>([]);
  let workflows = $state<Workflow[]>([]);
  let loading = $state(true);
  let deleteConfirm = $state<string | null>(null);

  // --- Builder state ---
  let builderExpr = $state('');
  let builderValidation = $state<PipelineValidation | null>(null);
  let builderValidating = $state(false);
  let builderRunning = $state(false);
  let builderResult = $state<PipelineRunResult | null>(null);
  let builderError = $state('');
  let showSaveForm = $state(false);
  let saveId = $state('');
  let saveDesc = $state('');

  // --- Edit state ---
  let editingId = $state<string | null>(null);
  let editExpr = $state('');
  let editDesc = $state('');
  let editValidation = $state<PipelineValidation | null>(null);
  let editValidating = $state(false);

  // --- Run results per saved pipeline ---
  let runResults = $state<Record<string, { result?: PipelineRunResult; error?: string; loading: boolean }>>({});

  // --- Drag state ---
  let dragOverTarget = $state<string | null>(null);

  let validateTimeout: ReturnType<typeof setTimeout> | null = null;

  // --- i18n ---
  $effect(() => {
    const unsub = i18nSubscribe(() => _i18n++);
    return () => {
      unsub();
      if (validateTimeout) clearTimeout(validateTimeout);
    };
  });

  $effect(() => { loadData(); });

  // --- Expression parsing ---
  function parseExpr(expr: string): { names: string[]; ops: PipelineOperator[] } {
    if (!expr.trim()) return { names: [], ops: [] };
    const parts = expr.split(/\s*(&&|[|,])\s*/).filter(Boolean);
    const names: string[] = [];
    const ops: PipelineOperator[] = [];
    for (const p of parts) {
      if (p === '|' || p === '&&' || p === ',') ops.push(p);
      else if (p.trim()) names.push(p.trim());
    }
    return { names, ops };
  }

  function buildExpr(names: string[], ops: PipelineOperator[]): string {
    if (names.length === 0) return '';
    let expr = names[0];
    for (let i = 1; i < names.length; i++) {
      const op = ops[i - 1] || '|';
      expr += ` ${op} ${names[i]}`;
    }
    return expr;
  }

  function nextOp(op: PipelineOperator): PipelineOperator {
    if (op === '|') return '&&';
    if (op === '&&') return ',';
    return '|';
  }

  function opColor(op: PipelineOperator): string {
    if (op === '|') return '#34d399';
    if (op === '&&') return '#fbbf24';
    return '#38bdf8';
  }

  function opBorderClass(op: PipelineOperator): string {
    if (op === '|') return 'border-emerald-500/40 text-emerald-400';
    if (op === '&&') return 'border-amber-500/40 text-amber-400';
    return 'border-sky-500/40 text-sky-400';
  }

  // --- Expression manipulation helpers ---
  function addNodeToExpr(expr: string, name: string): string {
    const { names, ops } = parseExpr(expr);
    names.push(name);
    if (names.length > 1) ops.push('|');
    return buildExpr(names, ops);
  }

  function removeNodeFromExpr(expr: string, index: number): string {
    const { names, ops } = parseExpr(expr);
    names.splice(index, 1);
    if (index > 0) ops.splice(index - 1, 1);
    else if (ops.length > 0) ops.splice(0, 1);
    return buildExpr(names, ops);
  }

  function toggleOpInExpr(expr: string, index: number): string {
    const { names, ops } = parseExpr(expr);
    if (index < ops.length) ops[index] = nextOp(ops[index]);
    return buildExpr(names, ops);
  }

  // --- Derived visual state ---
  let builderParsed = $derived.by(() => parseExpr(builderExpr));
  let editParsed = $derived.by(() => parseExpr(editExpr));

  // --- Data loading ---
  async function loadData() {
    loading = true;
    try {
      const [p, w] = await Promise.all([getPipelines(), getWorkflows()]);
      pipelines = p;
      workflows = w;
    } catch {
      // graceful fallback in demo mode
    }
    loading = false;
  }

  function formatDate(iso?: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // --- Validation (debounced) ---
  function debounceValidate(expression: string, target: 'builder' | 'edit') {
    if (validateTimeout) clearTimeout(validateTimeout);
    if (!expression.trim()) {
      if (target === 'builder') { builderValidation = null; builderValidating = false; }
      else { editValidation = null; editValidating = false; }
      return;
    }
    if (target === 'builder') builderValidating = true;
    else editValidating = true;

    validateTimeout = setTimeout(async () => {
      try {
        const result = await validatePipeline(expression);
        if (target === 'builder') builderValidation = result;
        else editValidation = result;
      } catch {
        const err = { valid: false, error: 'Validation request failed' };
        if (target === 'builder') builderValidation = err;
        else editValidation = err;
      }
      if (target === 'builder') builderValidating = false;
      else editValidating = false;
    }, 500);
  }

  // --- Builder actions ---
  function builderAddNode(name: string) {
    builderExpr = addNodeToExpr(builderExpr, name);
    debounceValidate(builderExpr, 'builder');
  }

  function builderRemoveNode(i: number) {
    builderExpr = removeNodeFromExpr(builderExpr, i);
    debounceValidate(builderExpr, 'builder');
  }

  function builderToggleOp(i: number) {
    builderExpr = toggleOpInExpr(builderExpr, i);
    debounceValidate(builderExpr, 'builder');
  }

  // --- Edit actions ---
  function editAddNode(name: string) {
    editExpr = addNodeToExpr(editExpr, name);
    debounceValidate(editExpr, 'edit');
  }

  function editRemoveNode(i: number) {
    editExpr = removeNodeFromExpr(editExpr, i);
    debounceValidate(editExpr, 'edit');
  }

  function editToggleOp(i: number) {
    editExpr = toggleOpInExpr(editExpr, i);
    debounceValidate(editExpr, 'edit');
  }

  // --- Drag and drop ---
  function handleDragStart(e: DragEvent, name: string) {
    e.dataTransfer?.setData('text/plain', name);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  }

  function handleDragOver(e: DragEvent, target: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOverTarget = target;
  }

  function handleDragLeave() {
    dragOverTarget = null;
  }

  function handleDrop(e: DragEvent, target: string) {
    e.preventDefault();
    dragOverTarget = null;
    const name = e.dataTransfer?.getData('text/plain');
    if (!name) return;
    if (target === 'builder') builderAddNode(name);
    else if (target === 'edit') editAddNode(name);
  }

  // --- Quick run ---
  async function handleBuilderRun() {
    if (!builderExpr.trim()) return;
    builderRunning = true;
    builderResult = null;
    builderError = '';
    try {
      builderResult = await runPipelineExpression(builderExpr.trim());
    } catch (e) {
      builderError = e instanceof Error ? e.message : 'Run failed';
    }
    builderRunning = false;
  }

  // --- Create pipeline ---
  async function handleCreate() {
    if (!builderExpr.trim()) return;
    try {
      await createPipeline({
        id: saveId.trim() || undefined,
        expression: builderExpr.trim(),
        description: saveDesc.trim(),
      });
      showToast('Pipeline created', 'success');
      saveId = ''; saveDesc = ''; showSaveForm = false;
      await loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Create failed', 'error');
    }
  }

  // --- Edit pipeline ---
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

  // --- Delete pipeline ---
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

  // --- Load expression into builder ---
  function loadIntoBuilder(expr: string) {
    builderExpr = expr;
    builderResult = null;
    builderError = '';
    debounceValidate(builderExpr, 'builder');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

{#snippet nodeFlow(names: string[], ops: PipelineOperator[], onRemove: (i: number) => void, onToggle: (i: number) => void)}
  <div class="flex items-center flex-wrap gap-y-3 gap-x-0">
    {#each names as name, i}
      <!-- Node -->
      <div class="group flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-600/50 px-3 py-2 hover:border-emerald-500/40 transition-colors">
        <svg class="h-3.5 w-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span class="font-mono text-xs text-slate-200">{name}</span>
        <button
          onclick={() => onRemove(i)}
          class="ml-0.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Remove {name}"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Connection SVG -->
      {#if i < names.length - 1}
        {@const op = ops[i] || '|'}
        <button
          onclick={() => onToggle(i)}
          class="flex items-center shrink-0 mx-0.5 group/conn"
          title={(void _i18n, t('pipelines.clickToToggle'))}
        >
          <div class="relative flex items-center">
            <svg width="64" height="28" viewBox="0 0 64 28" class="shrink-0">
              <line
                x1="2" y1="14" x2="48" y2="14"
                stroke={opColor(op)}
                stroke-width="2"
                stroke-dasharray={op === ',' ? '5,3' : undefined}
                stroke-opacity="0.6"
              />
              <polygon points="48,10 56,14 48,18" fill={opColor(op)} fill-opacity="0.6" />
            </svg>
            <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border bg-slate-900/95 backdrop-blur-sm group-hover/conn:scale-110 transition-transform {opBorderClass(op)}">
              {op}
            </span>
          </div>
        </button>
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet workflowSidebar(onAdd: (name: string) => void)}
  <div class="md:w-44 shrink-0">
    <p class="text-xs font-medium text-slate-400 mb-2">{void _i18n, t('pipelines.workflows')}</p>
    <div class="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:max-h-[200px] md:overflow-y-auto pb-2 md:pb-0 scrollbar-thin">
      {#each workflows as wf}
        <div
          draggable="true"
          ondragstart={(e: DragEvent) => handleDragStart(e, wf.name)}
          role="listitem"
          class="cursor-grab active:cursor-grabbing rounded-lg bg-slate-700/40 border border-slate-600/30 px-3 py-1.5 text-xs text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors whitespace-nowrap select-none"
          title={wf.description}
        >
          <button onclick={() => onAdd(wf.name)} class="flex items-center gap-1.5 w-full text-left">
            <svg class="h-3 w-3 text-emerald-400/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            {wf.name}
          </button>
        </div>
      {/each}
      {#if workflows.length === 0}
        <p class="text-xs text-slate-500 italic">{void _i18n, t('pipelines.noWorkflows')}</p>
      {/if}
    </div>
  </div>
{/snippet}

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold text-slate-100">{void _i18n, t('pipelines.title')}</h1>
    <p class="text-sm text-slate-400 mt-1">{pipelines.length} pipelines</p>
  </div>

  <!-- Pipeline Builder -->
  <div class="rounded-lg border border-slate-700/50 bg-slate-800 overflow-hidden">
    <!-- Title bar -->
    <div class="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
      <svg class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <span class="text-sm font-semibold text-slate-200">{void _i18n, t('pipelines.builder')}</span>
    </div>

    <div class="p-4 space-y-4">
      <!-- Visual editor: sidebar + canvas -->
      <div class="flex flex-col md:flex-row gap-3">
        <!-- Workflow sidebar -->
        {@render workflowSidebar(builderAddNode)}

        <!-- Canvas drop zone -->
        <div
          class="flex-1 min-h-[120px] rounded-lg border-2 border-dashed transition-colors p-4 {dragOverTarget === 'builder' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-900/30'}"
          ondragover={(e: DragEvent) => handleDragOver(e, 'builder')}
          ondragleave={handleDragLeave}
          ondrop={(e: DragEvent) => handleDrop(e, 'builder')}
          role="region"
          aria-label="Pipeline canvas"
        >
          {#if builderParsed.names.length === 0}
            <div class="flex flex-col items-center justify-center h-full min-h-[80px] text-slate-500">
              <svg class="h-8 w-8 mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <p class="text-xs">{void _i18n, t('pipelines.dropHere')}</p>
            </div>
          {:else}
            {@render nodeFlow(builderParsed.names, builderParsed.ops, builderRemoveNode, builderToggleOp)}
          {/if}
        </div>
      </div>

      <!-- Text expression input + action buttons -->
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={builderExpr}
          oninput={() => debounceValidate(builderExpr, 'builder')}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleBuilderRun(); }}
          placeholder={(void _i18n, t('pipelines.expressionPlaceholder'))}
          class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
        />
        <button
          onclick={handleBuilderRun}
          disabled={builderRunning || !builderExpr.trim()}
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {#if builderRunning}
            <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {:else}
            {void _i18n, t('pipelines.run')}
          {/if}
        </button>
        <button
          onclick={() => { showSaveForm = !showSaveForm; }}
          disabled={!builderExpr.trim()}
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-50 transition-colors"
        >
          {void _i18n, t('pipelines.savePipeline')}
        </button>
      </div>

      <!-- Validation -->
      {#if builderValidating}
        <p class="text-xs text-slate-500">{void _i18n, t('pipelines.validating')}</p>
      {:else if builderValidation}
        {#if builderValidation.valid}
          <p class="text-xs text-emerald-400">{void _i18n, t('pipelines.valid')}</p>
        {:else}
          <p class="text-xs text-red-400">{builderValidation.error}</p>
        {/if}
      {/if}

      <!-- Save form (inline) -->
      {#if showSaveForm}
        <div class="rounded-lg border border-emerald-500/30 bg-slate-900/50 p-4 space-y-3">
          <input
            type="text"
            bind:value={saveId}
            placeholder={(void _i18n, t('pipelines.pipelineId'))}
            class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
          />
          <input
            type="text"
            bind:value={saveDesc}
            placeholder={(void _i18n, t('pipelines.descPlaceholder'))}
            class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
          />
          <div class="flex gap-2">
            <button
              onclick={handleCreate}
              disabled={!builderExpr.trim()}
              class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {void _i18n, t('pipelines.create')}
            </button>
            <button
              onclick={() => showSaveForm = false}
              class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {void _i18n, t('common.cancel')}
            </button>
          </div>
        </div>
      {/if}

      <!-- Run result -->
      {#if builderResult}
        <div class="rounded-lg border p-3 {builderResult.exit_code === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-xs font-medium {builderResult.exit_code === 0 ? 'text-emerald-400' : 'text-red-400'}">
              {builderResult.exit_code === 0 ? 'Success' : `Exit ${builderResult.exit_code}`}
            </span>
            {#if builderResult.duration}
              <span class="text-xs text-slate-500">{builderResult.duration}ms</span>
            {/if}
            <button onclick={() => builderResult = null} class="ml-auto text-xs text-slate-500 hover:text-slate-300">{void _i18n, t('pipelines.dismiss')}</button>
          </div>
          <pre class="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">{builderResult.output}</pre>
        </div>
      {/if}
      {#if builderError}
        <div class="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center justify-between">
          <p class="text-xs text-red-400">{builderError}</p>
          <button onclick={() => builderError = ''} class="text-xs text-slate-500 hover:text-slate-300 ml-2">{void _i18n, t('pipelines.dismiss')}</button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Loading -->
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <span class="inline-block w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></span>
    </div>
  {/if}

  <!-- Saved Pipelines -->
  {#if !loading && pipelines.length > 0}
    <div>
      <h2 class="text-sm font-semibold text-slate-300 mb-3">{void _i18n, t('pipelines.savedPipelines')}</h2>
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
                  <div class="min-w-0">
                    <h3 class="text-sm font-semibold text-slate-200">{p.id}</h3>
                    <!-- Mini visual preview -->
                    {#if p.expression}
                      {@const preview = parseExpr(p.expression)}
                      <div class="flex items-center gap-1 mt-1 flex-wrap">
                        {#each preview.names as name, i}
                          <span class="text-[11px] font-mono text-slate-400 bg-slate-700/40 rounded px-1.5 py-0.5">{name}</span>
                          {#if i < preview.names.length - 1}
                            {@const op = preview.ops[i] || '|'}
                            <span class="text-[10px] font-mono font-bold {opBorderClass(op)}">{op}</span>
                          {/if}
                        {/each}
                      </div>
                    {/if}
                    {#if p.description}
                      <p class="text-xs text-slate-500 mt-0.5 truncate">{p.description}</p>
                    {/if}
                  </div>
                </div>
              </button>
              <div class="flex items-center gap-3 ml-4 shrink-0">
                <span class="text-xs text-slate-500 hidden sm:inline">{formatDate(p.created)}</span>
                <!-- Load into builder -->
                <button
                  onclick={() => loadIntoBuilder(p.expression)}
                  class="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                  title="Load into builder"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/><path d="M21 3L14 10"/></svg>
                </button>
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
                  <button onclick={() => handleDelete(p.id)} class="text-xs text-red-400 hover:text-red-300 font-medium">{void _i18n, t('common.confirm')}</button>
                  <button onclick={() => deleteConfirm = null} class="text-xs text-slate-500 hover:text-slate-300">{void _i18n, t('common.cancel')}</button>
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
                      <button onclick={() => { const copy = { ...runResults }; delete copy[p.id]; runResults = copy; }} class="ml-auto text-xs text-slate-500 hover:text-slate-300">{void _i18n, t('pipelines.dismiss')}</button>
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
                <!-- Visual editor for editing -->
                <div class="flex flex-col md:flex-row gap-3">
                  {@render workflowSidebar(editAddNode)}
                  <div
                    class="flex-1 min-h-[80px] rounded-lg border-2 border-dashed transition-colors p-3 {dragOverTarget === 'edit' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-900/30'}"
                    ondragover={(e: DragEvent) => handleDragOver(e, 'edit')}
                    ondragleave={handleDragLeave}
                    ondrop={(e: DragEvent) => handleDrop(e, 'edit')}
                    role="region"
                  >
                    {#if editParsed.names.length === 0}
                      <div class="flex items-center justify-center h-full min-h-[48px] text-slate-500 text-xs">
                        {void _i18n, t('pipelines.dropHere')}
                      </div>
                    {:else}
                      {@render nodeFlow(editParsed.names, editParsed.ops, editRemoveNode, editToggleOp)}
                    {/if}
                  </div>
                </div>

                <input
                  type="text"
                  bind:value={editExpr}
                  oninput={() => debounceValidate(editExpr, 'edit')}
                  placeholder={(void _i18n, t('pipelines.expressionPlaceholder'))}
                  class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
                />

                {#if editValidating}
                  <p class="text-xs text-slate-500">{void _i18n, t('pipelines.validating')}</p>
                {:else if editValidation}
                  {#if editValidation.valid}
                    <p class="text-xs text-emerald-400">{void _i18n, t('pipelines.valid')}</p>
                  {:else}
                    <p class="text-xs text-red-400 mt-1">{editValidation.error}</p>
                  {/if}
                {/if}

                <input
                  type="text"
                  bind:value={editDesc}
                  placeholder={(void _i18n, t('pipelines.descPlaceholder'))}
                  class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
                />

                <div class="flex gap-2">
                  <button
                    onclick={handleUpdate}
                    class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    {void _i18n, t('workflows.saveChanges')}
                  </button>
                  <button
                    onclick={() => editingId = null}
                    class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {void _i18n, t('common.cancel')}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty state -->
  {#if !loading && pipelines.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <p class="text-sm">{void _i18n, t('pipelines.noPipelines')}</p>
      <p class="text-xs mt-1">{void _i18n, t('pipelines.noPipelinesHint')}</p>
    </div>
  {/if}
</div>
