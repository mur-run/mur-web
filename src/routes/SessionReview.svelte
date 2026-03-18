<script lang="ts">
  import { getSession, extractWorkflowFromSession, createWorkflow, getDataSource } from '../lib/api';
  import { navigate } from '../lib/router';
  import { isRelayAgentOnline, relayCommand } from '../lib/relay';
  import type { SessionDetail, SessionEvent, Workflow, WorkflowVariable } from '../lib/types';
  import { t, subscribe as i18nSubscribe } from '../lib/i18n';

  let { id }: { id: string } = $props();

  let session = $state<SessionDetail | null>(null);
  let loading = $state(true);
  let error = $state('');
  let expandedEvents = $state<Set<number>>(new Set());
  let _i18n = $state(0);

  // Extract workflow state
  let extracting = $state(false);
  let extractedWorkflow = $state<Workflow | null>(null);
  let editName = $state('');
  let editDesc = $state('');
  let editSteps = $state<string[]>([]);
  let editTools = $state<string[]>([]);
  let editVariables = $state<WorkflowVariable[]>([]);
  let saving = $state(false);
  let relayAvailable = $state(false);

  const varTypes = ['string', 'url', 'path', 'number', 'bool', 'array'] as const;

  /** Can we show the extract button? Local mode always, cloud mode only with relay agent */
  const canExtract = $derived(
    getDataSource() === 'local' || (getDataSource() === 'cloud' && relayAvailable)
  );

  $effect(() => {
    loadSession();
    const unsub = i18nSubscribe(() => _i18n++);
    // Check relay agent status in cloud mode
    if (getDataSource() === 'cloud') {
      isRelayAgentOnline().then(ok => { relayAvailable = ok; });
    }
    return unsub;
  });

  async function loadSession() {
    loading = true;
    error = '';
    try {
      session = await getSession(id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load session';
    } finally {
      loading = false;
    }
  }

  function shortId(sid: string): string {
    return sid.length > 8 ? sid.slice(0, 8) : sid;
  }

  function formatTimestamp(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  }

  function typeColor(type: string): string {
    switch (type) {
      case 'user': return 'border-blue-500 bg-blue-500/10';
      case 'assistant': return 'border-emerald-500 bg-emerald-500/10';
      case 'tool_call': return 'border-amber-500 bg-amber-500/10';
      case 'tool_result': return 'border-slate-500 bg-slate-500/10';
      default: return 'border-slate-600 bg-slate-800';
    }
  }

  function typeBadgeColor(type: string): string {
    switch (type) {
      case 'user': return 'bg-blue-500/20 text-blue-400';
      case 'assistant': return 'bg-emerald-500/20 text-emerald-400';
      case 'tool_call': return 'bg-amber-500/20 text-amber-400';
      case 'tool_result': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-700 text-slate-400';
    }
  }

  function isToolEvent(type: string): boolean {
    return type === 'tool_call' || type === 'tool_result';
  }

  function isLong(content: string): boolean {
    return content.length > 500;
  }

  function toggleExpand(idx: number) {
    const next = new Set(expandedEvents);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    expandedEvents = next;
  }

  async function handleExtract() {
    extracting = true;
    error = '';
    try {
      let wf: Workflow;
      if (getDataSource() === 'cloud') {
        // Use relay to execute extract on the Commander agent
        const result = await relayCommand('extract_workflow', { session_id: id });
        if (!result.success) {
          throw new Error(result.error || 'Relay command failed');
        }
        wf = result.data as Workflow;
      } else {
        wf = await extractWorkflowFromSession(id);
      }
      extractedWorkflow = wf;
      editName = wf.name;
      editDesc = wf.description;
      editSteps = [...(wf.steps || [])];
      editTools = [...(wf.tools || [])];
      editVariables = (wf.variables || []).map(v => ({ ...v }));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to extract workflow';
    } finally {
      extracting = false;
    }
  }

  // Step management
  function addStep() { editSteps = [...editSteps, '']; }
  function removeStep(i: number) { editSteps = editSteps.filter((_, idx) => idx !== i); }
  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= editSteps.length) return;
    const copy = [...editSteps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    editSteps = copy;
  }

  // Variable management
  function addVariable() {
    editVariables = [...editVariables, {
      name: '',
      type: 'string',
      required: false,
      default_value: '',
      description: '',
    }];
  }
  function removeVariable(i: number) {
    editVariables = editVariables.filter((_, idx) => idx !== i);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    saving = true;
    error = '';
    try {
      await createWorkflow({
        name: editName.trim(),
        description: editDesc.trim(),
        steps: editSteps.filter(s => s.trim()),
        tools: editTools,
        variables: editVariables.filter(v => v.name.trim()),
      });
      navigate('/workflows');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save workflow';
    } finally {
      saving = false;
    }
  }

  function cancelExtract() {
    extractedWorkflow = null;
    editName = '';
    editDesc = '';
    editSteps = [];
    editTools = [];
    editVariables = [];
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <button
      onclick={() => navigate('/sessions')}
      class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
    >
      {void _i18n, t('common.back')}
    </button>
    <div class="flex-1">
      <h1 class="text-2xl font-bold text-slate-100">
        {t('session.title')} <span class="font-mono text-emerald-400">{shortId(id)}</span>
      </h1>
      {#if session}
        <p class="text-sm text-slate-400 mt-0.5">
          {session.event_count || session.events?.length || 0} {t('session.events')} · {new Date(session.modified_at || session.updated_at || session.stopped_at || session.created_at).toLocaleString()}
        </p>
      {/if}
    </div>
    {#if session && !extractedWorkflow && canExtract}
      <button
        onclick={handleExtract}
        disabled={extracting}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {extracting ? t('session.extracting') : t('session.extractWorkflow')}
      </button>
    {/if}
  </div>

  <!-- Extracted workflow preview/edit form -->
  {#if extractedWorkflow}
    <div class="rounded-lg border border-emerald-500/30 bg-slate-800 p-5 space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-emerald-400">{t('session.extractedTitle')}</h2>
        <button onclick={cancelExtract} class="text-xs text-slate-500 hover:text-slate-300 transition-colors">{t('common.cancel')}</button>
      </div>

      <!-- Name -->
      <div>
        <label for="session-name" class="text-xs font-medium text-slate-400 mb-1 block">{t('common.name')}</label>
        <input
          id="session-name" type="text"
          placeholder={t('workflows.namePlaceholder')}
          bind:value={editName}
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      <!-- Description -->
      <div>
        <label for="session-description" class="text-xs font-medium text-slate-400 mb-1 block">{t('common.description')}</label>
        <textarea
          id="session-description" placeholder={t('workflows.descPlaceholder')}
          bind:value={editDesc}
          rows="2"
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors resize-none"
        ></textarea>
      </div>

      <!-- Detected Tools -->
      {#if editTools.length > 0}
        <div>
          <span class="text-xs font-medium text-slate-400 mb-2 block">{t('session.detectedTools')}</span>
          <div class="flex flex-wrap gap-2">
            {#each editTools as tool}
              <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                {tool}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Variables -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-slate-400">{t('common.variables')} ({editVariables.length})</span>
          <button onclick={addVariable} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('workflows.addVariable')}</button>
        </div>
        {#if editVariables.length > 0}
          <div class="space-y-2">
            {#each editVariables as variable, i}
              <div class="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 flex items-center gap-2 flex-wrap">
                <!-- Name (compact) -->
                <input
                  id="session-name" type="text"
                  placeholder="name"
                  bind:value={editVariables[i].name}
                  class="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition-colors"
                />
                <!-- Type -->
                <select
                  bind:value={editVariables[i].type}
                  class="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
                >
                  {#each varTypes as vt}
                    <option value={vt}>{vt}</option>
                  {/each}
                </select>
                <!-- Default -->
                <input
                  id="session-name" type="text"
                  placeholder="default"
                  bind:value={editVariables[i].default_value}
                  class="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition-colors"
                />
                <!-- Description -->
                <input
                  type="text"
                  id="session-description" placeholder="description"
                  bind:value={editVariables[i].description}
                  class="flex-1 min-w-[120px] rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition-colors"
                />
                <!-- Required -->
                <label class="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    bind:checked={editVariables[i].required}
                    class="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 h-3 w-3"
                  />
                  {t('common.required')}
                </label>
                <!-- Remove -->
                <button onclick={() => removeVariable(i)} class="text-red-400 hover:text-red-300 transition-colors text-xs" title="Remove">×</button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-xs text-slate-600 italic">{t('workflows.noVariables')}</p>
        {/if}
      </div>

      <!-- Steps -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-slate-400">{t('common.steps')} ({editSteps.length})</span>
          <button onclick={addStep} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('workflows.addStep')}</button>
        </div>
        <div class="space-y-2">
          {#each editSteps as step, i}
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 w-5 text-right">{i + 1}.</span>
              <input
                id="session-name" type="text"
                bind:value={editSteps[i]}
                class="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
              />
              <button onclick={() => moveStep(i, -1)} disabled={i === 0} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move up">↑</button>
              <button onclick={() => moveStep(i, 1)} disabled={i === editSteps.length - 1} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move down">↓</button>
              <button onclick={() => removeStep(i)} class="text-red-400 hover:text-red-300 transition-colors" title="Remove">×</button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2 border-t border-slate-700/50">
        <button
          onclick={handleSave}
          disabled={saving || !editName.trim()}
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {saving ? t('session.saving') : t('session.saveWorkflow')}
        </button>
        <button
          onclick={cancelExtract}
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
      <p class="text-sm text-rose-400">{error}</p>
    </div>
  {/if}

  {#if loading}
    <div class="space-y-3">
      {#each Array(8) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 animate-pulse">
          <div class="h-3 w-24 rounded bg-slate-700"></div>
          <div class="mt-2 h-3 w-full rounded bg-slate-700"></div>
          <div class="mt-1 h-3 w-2/3 rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else if session && session.events.length > 0}
    <!-- Timeline -->
    <div class="relative space-y-3">
      <div class="absolute left-5 top-0 bottom-0 w-px bg-slate-700/50"></div>

      {#each session.events as event, idx}
        {@const expanded = expandedEvents.has(idx)}
        {@const long = isLong(event.content)}
        {@const toolEvent = isToolEvent(event.type)}

        <div class="relative pl-12">
          <div class="absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 {typeColor(event.type)}"></div>

          <div class="rounded-lg border-l-2 {typeColor(event.type)} bg-slate-800/50 p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="rounded px-1.5 py-0.5 text-[10px] font-medium {typeBadgeColor(event.type)}">
                {event.type}
              </span>
              {#if event.tool}
                <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                  {event.tool}
                </span>
              {/if}
              <span class="text-[10px] text-slate-500 ml-auto">{formatTimestamp(event.timestamp)}</span>
            </div>

            {#if toolEvent}
              <pre class="text-xs text-slate-300 bg-slate-900/50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words {long && !expanded ? 'max-h-32 overflow-hidden' : ''}">{long && !expanded ? event.content.slice(0, 500) + '...' : event.content}</pre>
            {:else}
              <div class="text-sm text-slate-300 whitespace-pre-wrap break-words {long && !expanded ? 'max-h-32 overflow-hidden' : ''}">
                {long && !expanded ? event.content.slice(0, 500) + '...' : event.content}
              </div>
            {/if}

            {#if long}
              <button
                onclick={() => toggleExpand(idx)}
                class="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {expanded ? t('session.collapse') : t('session.showAll', { chars: event.content.length.toLocaleString() })}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if session}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <p class="text-sm">{t('session.noEvents')}</p>
    </div>
  {/if}
</div>
