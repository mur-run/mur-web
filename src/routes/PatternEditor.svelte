<script lang="ts">
  import { navigate } from '../lib/router';
  import { getPattern, updatePattern } from '../lib/api';
  import type { Pattern } from '../lib/types';
  import VisualEditor from '../components/VisualEditor.svelte';
  import SourceEditor from '../components/SourceEditor.svelte';
  import DiffPreview from '../components/DiffPreview.svelte';

  interface Props {
    id: string;
  }

  let { id }: Props = $props();

  let pattern = $state<Pattern | null>(null);
  let originalPattern = $state<Pattern | null>(null);
  let activeTab = $state<'visual' | 'source'>('visual');
  let showDiff = $state(false);
  let saving = $state(false);
  let hasChanges = $state(false);

  $effect(() => {
    loadPattern(id);
  });

  async function loadPattern(patternId: string) {
    const p = await getPattern(patternId);
    if (p) {
      pattern = structuredClone(p);
      originalPattern = structuredClone(p);
      hasChanges = false;
    }
  }

  function handleChange(updated: Pattern) {
    pattern = updated;
    hasChanges = true;
  }

  function handleSave() {
    if (pattern && originalPattern) {
      showDiff = true;
    }
  }

  async function confirmSave() {
    if (!pattern) return;
    saving = true;
    try {
      await updatePattern(pattern.id, pattern);
      originalPattern = structuredClone(pattern);
      hasChanges = false;
      showDiff = false;
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    if (originalPattern) {
      pattern = structuredClone(originalPattern);
      hasChanges = false;
    }
  }
</script>

{#if pattern && originalPattern}
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          onclick={() => navigate('/patterns')}
          aria-label="Back to patterns"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-slate-100">{pattern.id}</h1>
          <p class="text-xs text-slate-500">{pattern.tier} pattern</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        {#if hasChanges}
          <button
            onclick={handleCancel}
            class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onclick={handleSave}
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        {/if}
      </div>
    </div>

    <!-- Tab toggle -->
    <div class="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5 w-fit">
      <button
        onclick={() => activeTab = 'visual'}
        class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'visual' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}"
      >
        Visual
      </button>
      <button
        onclick={() => activeTab = 'source'}
        class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'source' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}"
      >
        Source
      </button>
    </div>

    <!-- Editor content -->
    {#if activeTab === 'visual'}
      <VisualEditor bind:pattern onchange={handleChange} />
    {:else}
      <div class="h-[600px] rounded-lg border border-slate-700 overflow-hidden">
        <SourceEditor {pattern} onchange={handleChange} />
      </div>
    {/if}
  </div>

  <!-- Diff preview modal -->
  {#if showDiff}
    <DiffPreview
      original={originalPattern}
      modified={pattern}
      onconfirm={confirmSave}
      oncancel={() => showDiff = false}
    />
  {/if}
{:else}
  <div class="flex items-center justify-center py-24">
    <div class="text-center">
      <div class="mb-4 text-4xl opacity-30">?</div>
      <p class="text-slate-400">Pattern not found</p>
      <button
        onclick={() => navigate('/patterns')}
        class="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
      >
        Back to Patterns
      </button>
    </div>
  </div>
{/if}
