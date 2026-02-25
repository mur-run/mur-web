<script lang="ts">
  import * as store from '../lib/dataStore';
  import type { Workflow } from '../lib/types';

  let workflows = $state<Workflow[]>([]);
  let showNew = $state(false);
  let editingId = $state<string | null>(null);
  let deleteConfirm = $state<string | null>(null);

  // New workflow form
  let newName = $state('');
  let newDesc = $state('');
  let newSteps = $state<string[]>(['']);

  // Edit form
  let editName = $state('');
  let editDesc = $state('');
  let editSteps = $state<string[]>([]);

  $effect(() => {
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
      <h1 class="text-2xl font-bold text-slate-100">Workflows</h1>
      <p class="text-sm text-slate-400 mt-1">{workflows.length} workflows</p>
    </div>
    <button
      onclick={() => { showNew = !showNew; }}
      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
    >
      {showNew ? 'Cancel' : '+ New Workflow'}
    </button>
  </div>

  <!-- New workflow form -->
  {#if showNew}
    <div class="rounded-lg border border-emerald-500/30 bg-slate-800 p-5 space-y-4">
      <h2 class="text-sm font-semibold text-emerald-400">New Workflow</h2>
      <input
        type="text"
        placeholder="Workflow name"
        bind:value={newName}
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
      />
      <textarea
        placeholder="Description"
        bind:value={newDesc}
        rows="2"
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors resize-none"
      ></textarea>

      <div class="space-y-2">
        <p class="text-xs font-medium text-slate-400">Steps</p>
        {#each newSteps as step, i}
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 w-5 text-right">{i + 1}.</span>
            <input
              type="text"
              placeholder="Step description"
              bind:value={newSteps[i]}
              class="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button onclick={() => moveNewStep(i, -1)} disabled={i === 0} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move up">↑</button>
            <button onclick={() => moveNewStep(i, 1)} disabled={i === newSteps.length - 1} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move down">↓</button>
            <button onclick={() => removeNewStep(i)} class="text-red-400 hover:text-red-300 transition-colors" title="Remove">×</button>
          </div>
        {/each}
        <button onclick={addNewStep} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">+ Add step</button>
      </div>

      <button
        onclick={handleCreate}
        disabled={!newName.trim()}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        Create Workflow
      </button>
    </div>
  {/if}

  <!-- Workflow list -->
  <div class="space-y-3">
    {#each workflows as wf}
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
              <button onclick={() => handleDelete(wf.id)} class="text-xs text-red-400 hover:text-red-300 font-medium">Confirm</button>
              <button onclick={() => deleteConfirm = null} class="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
            {:else}
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

            <div class="space-y-2">
              <p class="text-xs font-medium text-slate-400">Steps</p>
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
              <button onclick={addEditStep} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">+ Add step</button>
            </div>

            <div class="flex gap-2">
              <button
                onclick={handleUpdate}
                class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Save Changes
              </button>
              <button
                onclick={() => editingId = null}
                class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
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

  {#if workflows.length === 0 && !showNew}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a9 9 0 0 1-9 9" />
      </svg>
      <p class="text-sm">No workflows yet</p>
      <p class="text-xs mt-1">Create one to define reusable step sequences</p>
    </div>
  {/if}
</div>
