<script lang="ts">
  import * as store from '../lib/dataStore';
  import { navigate } from '../lib/router';
  import type { Workflow } from '../lib/types';

  let { id }: { id: string } = $props();

  let workflow = $state<Workflow | null>(null);
  let loading = $state(true);
  let error = $state('');
  let saving = $state(false);

  let editName = $state('');
  let editDesc = $state('');
  let editSteps = $state<string[]>([]);

  $effect(() => {
    loadWorkflow();
  });

  async function loadWorkflow() {
    loading = true;
    error = '';
    try {
      if (!store.isLoaded()) await store.load();
      const wf = store.getWorkflows().find(w => w.id === id);
      if (!wf) {
        error = `Workflow '${id}' not found`;
        return;
      }
      workflow = wf;
      editName = wf.name;
      editDesc = wf.description;
      editSteps = [...wf.steps];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load workflow';
    } finally {
      loading = false;
    }
  }

  function addStep() { editSteps = [...editSteps, '']; }
  function removeStep(i: number) { editSteps = editSteps.filter((_, idx) => idx !== i); }
  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= editSteps.length) return;
    const copy = [...editSteps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    editSteps = copy;
  }

  async function handleSave() {
    if (!editName.trim()) return;
    saving = true;
    error = '';
    try {
      await store.updateWorkflow(id, {
        name: editName.trim(),
        description: editDesc.trim(),
        steps: editSteps.filter(s => s.trim()),
      });
      navigate('/workflows');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save workflow';
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <button
      onclick={() => navigate('/workflows')}
      class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
    >
      ← Back
    </button>
    <div class="flex-1">
      <h1 class="text-2xl font-bold text-slate-100">Edit Workflow</h1>
      {#if workflow}
        <p class="text-sm text-slate-400 mt-0.5">
          {workflow.name} · {workflow.steps.length} steps
        </p>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
      <p class="text-sm text-rose-400">{error}</p>
    </div>
  {/if}

  {#if loading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 animate-pulse">
          <div class="h-3 w-full rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else if workflow}
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-5 space-y-4">
      <div>
        <label for="wf-name" class="text-xs font-medium text-slate-400">Name</label>
        <input
          id="wf-name"
          type="text"
          bind:value={editName}
          class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      <div>
        <label for="wf-desc" class="text-xs font-medium text-slate-400">Description</label>
        <textarea
          id="wf-desc"
          bind:value={editDesc}
          rows="3"
          class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors resize-none"
        ></textarea>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium text-slate-400">Steps ({editSteps.length})</p>
        {#each editSteps as step, i}
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 w-5 text-right">{i + 1}.</span>
            <input
              type="text"
              bind:value={editSteps[i]}
              class="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button onclick={() => moveStep(i, -1)} disabled={i === 0} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move up">↑</button>
            <button onclick={() => moveStep(i, 1)} disabled={i === editSteps.length - 1} class="text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors" title="Move down">↓</button>
            <button onclick={() => removeStep(i)} class="text-red-400 hover:text-red-300 transition-colors" title="Remove">×</button>
          </div>
        {/each}
        <button onclick={addStep} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">+ Add step</button>
      </div>

      <div class="flex gap-2 pt-2">
        <button
          onclick={handleSave}
          disabled={saving || !editName.trim()}
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onclick={() => navigate('/workflows')}
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>
