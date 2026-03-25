<script lang="ts">
  import { untrack } from 'svelte';
  import { parseSchedule, describeCron, getNextRun, formatNextRun } from '../lib/schedule-parser';
  import type { CommanderWorkflow } from '../lib/commander-types';

  interface Props {
    workflows: CommanderWorkflow[];
    editWorkflow?: CommanderWorkflow | null;
    onSave: (workflowId: string, cron: string, enabled: boolean) => void;
    onCancel: () => void;
  }

  let { workflows, editWorkflow = null, onSave, onCancel }: Props = $props();

  function extractCron(wf: CommanderWorkflow | null | undefined): string {
    if (!wf?.schedule) return '';
    return wf.schedule.replace(/^#disabled:\s*/, '').trim();
  }

  // Modal is recreated on each open — intentionally snapshot prop values at mount
  let selectedId = $state(untrack(() => editWorkflow?.id ?? ''));
  let nlInput = $state('');
  let cronExpr = $state(untrack(() => extractCron(editWorkflow)));
  let enabled = $state(untrack(() => !(editWorkflow?.schedule?.startsWith('#disabled') ?? false)));
  let nlError = $state('');

  let cronDescription = $derived(cronExpr.trim() ? describeCron(cronExpr.trim()) : '');
  let canSave = $derived(!!selectedId && !!cronExpr.trim());
  let nextRun = $derived(cronExpr.trim() ? getNextRun(cronExpr.trim()) : null);

  const NL_EXAMPLES = [
    'every day at 9am',
    'every hour',
    'weekdays at 8:30',
    'every Monday at noon',
    'every 5 minutes',
    'every Monday and Friday at 10am',
    'monthly',
  ];

  let exampleIdx = $state(0);
  let placeholder = $derived(NL_EXAMPLES[exampleIdx % NL_EXAMPLES.length]);

  // Cycle placeholder on focus
  function onNlFocus() {
    exampleIdx = (exampleIdx + 1) % NL_EXAMPLES.length;
  }

  function onNlChange() {
    if (!nlInput.trim()) {
      nlError = '';
      return;
    }
    const parsed = parseSchedule(nlInput);
    if (parsed) {
      cronExpr = parsed;
      nlError = '';
    } else {
      nlError = 'Could not parse — try "every day at 9am" or "weekdays at 8:30"';
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!canSave) return;
    onSave(selectedId, cronExpr.trim(), enabled);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onCancel();
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
  onclick={handleBackdropClick}
  onkeydown={(e) => { if (e.key === 'Escape') onCancel(); }}
  role="dialog"
  aria-modal="true"
  aria-label="Schedule editor"
  tabindex="-1"
>
  <!-- Modal panel -->
  <div class="w-full max-w-lg mx-4 rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
      <h2 class="text-base font-semibold text-slate-100">
        {editWorkflow ? 'Edit Schedule' : 'New Schedule'}
      </h2>
      <button
        onclick={onCancel}
        class="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        aria-label="Close"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <form onsubmit={handleSubmit} class="p-5 space-y-5">
      <!-- Workflow selector -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider" for="wf-select">
          Workflow
        </label>
        {#if editWorkflow}
          <div class="rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200">
            {editWorkflow.name}
            <span class="ml-2 text-xs text-slate-500">(editing)</span>
          </div>
        {:else}
          <select
            id="wf-select"
            bind:value={selectedId}
            class="w-full rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/60 focus:outline-none appearance-none"
          >
            <option value="" disabled>Select a workflow…</option>
            {#each workflows as wf}
              <option value={wf.id}>{wf.name}</option>
            {/each}
          </select>
        {/if}
      </div>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-700/40"></div></div>
        <div class="relative flex justify-center">
          <span class="bg-slate-900 px-2 text-xs text-slate-500">define schedule</span>
        </div>
      </div>

      <!-- Natural language input -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider" for="nl-input">
          Natural language
        </label>
        <input
          id="nl-input"
          type="text"
          bind:value={nlInput}
          oninput={onNlChange}
          onfocus={onNlFocus}
          placeholder={`e.g. ${placeholder}`}
          class="w-full rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500/60 focus:outline-none transition-colors"
        />
        {#if nlError}
          <p class="text-xs text-amber-400">{nlError}</p>
        {:else if nlInput && cronExpr}
          <p class="text-xs text-emerald-400">Parsed to: <code class="font-mono">{cronExpr}</code></p>
        {:else}
          <p class="text-xs text-slate-600">Type a plain-English schedule and it will be converted to cron</p>
        {/if}
      </div>

      <!-- Cron expression -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider" for="cron-input">
          Cron expression
        </label>
        <input
          id="cron-input"
          type="text"
          bind:value={cronExpr}
          placeholder="* * * * *"
          class="w-full rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2 font-mono text-sm text-emerald-300 placeholder-slate-600 focus:border-emerald-500/60 focus:outline-none transition-colors"
        />
        {#if cronDescription}
          <p class="text-xs text-slate-400">{cronDescription}</p>
          {#if nextRun}
            <p class="text-xs text-slate-500">Next run: <span class="text-emerald-400/80 font-medium">{formatNextRun(nextRun)}</span></p>
          {/if}
        {:else if cronExpr.trim()}
          <p class="text-xs text-slate-600">Invalid cron expression</p>
        {/if}
      </div>

      <!-- Quick presets -->
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Quick presets</p>
        <div class="flex flex-wrap gap-1.5">
          {#each [
            ['Every minute', '* * * * *'],
            ['Every hour', '0 * * * *'],
            ['Daily 9am', '0 9 * * *'],
            ['Weekdays 9am', '0 9 * * 1-5'],
            ['Weekly', '0 0 * * 0'],
            ['Monthly', '0 0 1 * *'],
          ] as [label, cron]}
            <button
              type="button"
              onclick={() => { cronExpr = cron; nlInput = ''; nlError = ''; }}
              class="rounded-md border border-slate-700/60 bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:border-emerald-500/40 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            >
              {label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Enable toggle -->
      <div class="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/60 px-4 py-3">
        <div>
          <p class="text-sm font-medium text-slate-200">Enable schedule</p>
          <p class="text-xs text-slate-500">Run automatically on the defined schedule</p>
        </div>
        <button
          type="button"
          onclick={() => enabled = !enabled}
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? 'Disable schedule' : 'Enable schedule'}
          class={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
          <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`}></span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onclick={onCancel}
          class="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave}
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          {editWorkflow ? 'Save Changes' : 'Create Schedule'}
        </button>
      </div>
    </form>
  </div>
</div>
