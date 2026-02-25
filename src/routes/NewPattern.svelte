<script lang="ts">
  import { navigate } from 'svelte-routing';
  import { createPattern } from '../lib/api';
  import type { Pattern, PatternTemplate } from '../lib/types';
  import VisualEditor from '../components/VisualEditor.svelte';

  const templates: PatternTemplate[] = [
    {
      name: 'Insight',
      icon: '\u{1F4A1}',
      description: 'A learned insight or observation from experience',
      defaults: {
        description: '',
        triggers: [],
        tags: ['insight'],
        tier: 'Project',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      },
    },
    {
      name: 'Technique',
      icon: '\u{1F527}',
      description: 'A specific technique or approach to solve a problem',
      defaults: {
        description: '',
        triggers: [],
        tags: ['technique'],
        tier: 'Global',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      },
    },
    {
      name: 'Pitfall',
      icon: '\u26A0\uFE0F',
      description: 'A common mistake or anti-pattern to avoid',
      defaults: {
        description: '',
        triggers: [],
        tags: ['pitfall', 'anti-pattern'],
        tier: 'Global',
        maturity: 'Draft',
        confidence: 0.6,
        examples: [],
      },
    },
    {
      name: 'Checklist',
      icon: '\u2705',
      description: 'A step-by-step checklist for a process or review',
      defaults: {
        description: '',
        triggers: [],
        tags: ['checklist'],
        tier: 'Project',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      },
    },
    {
      name: 'Custom',
      icon: '\u2728',
      description: 'Start from scratch with an empty pattern',
      defaults: {
        description: '',
        triggers: [],
        tags: [],
        tier: 'Project',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      },
    },
  ];

  let selectedTemplate = $state<PatternTemplate | null>(null);
  let patternId = $state('');
  let pattern = $state<Pattern | null>(null);
  let saving = $state(false);

  function selectTemplate(template: PatternTemplate) {
    selectedTemplate = template;
    pattern = {
      id: '',
      ...template.defaults,
      description: template.defaults.description || '',
      triggers: [...(template.defaults.triggers || [])],
      tags: [...(template.defaults.tags || [])],
      tier: template.defaults.tier || 'Project',
      maturity: template.defaults.maturity || 'Draft',
      confidence: template.defaults.confidence || 0.5,
      examples: [...(template.defaults.examples || [])],
      stats: {
        injections: 0,
        last_used: new Date().toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    };
  }

  function handleChange(updated: Pattern) {
    pattern = updated;
  }

  async function handleSave() {
    if (!pattern || !patternId.trim()) return;
    saving = true;
    try {
      pattern.id = patternId.trim().toLowerCase().replace(/\s+/g, '-');
      const { id, stats, ...rest } = pattern;
      await createPattern(rest as Omit<Pattern, 'id' | 'stats'>);
      navigate(`/patterns/${pattern.id}`);
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center gap-3">
    <button
      onclick={() => selectedTemplate ? (selectedTemplate = null, pattern = null) : navigate('/patterns')}
      aria-label="Go back"
      class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
    <div>
      <h1 class="text-xl font-bold text-slate-100">New Pattern</h1>
      <p class="text-xs text-slate-500">{selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Choose a template'}</p>
    </div>
  </div>

  {#if !selectedTemplate}
    <!-- Template picker -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each templates as template}
        <button
          onclick={() => selectTemplate(template)}
          class="group rounded-lg border border-slate-700/50 bg-slate-800 p-6 text-left hover:border-emerald-500/30 hover:bg-slate-800/80 transition-all"
        >
          <div class="text-3xl mb-3">{template.icon}</div>
          <h3 class="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{template.name}</h3>
          <p class="text-xs text-slate-400 mt-1">{template.description}</p>
        </button>
      {/each}
    </div>
  {:else if pattern}
    <!-- Pattern ID input -->
    <div>
      <label for="pattern-id" class="block text-sm font-medium text-slate-300 mb-1.5">Pattern ID</label>
      <input
        id="pattern-id"
        type="text"
        placeholder="my-pattern-name"
        bind:value={patternId}
        class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-colors"
      />
      <p class="text-xs text-slate-500 mt-1">Use lowercase with dashes (e.g., error-handling-pattern)</p>
    </div>

    <!-- Editor -->
    <VisualEditor bind:pattern onchange={handleChange} />

    <!-- Save -->
    <div class="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
      <button
        onclick={() => navigate('/patterns')}
        class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
      >
        Cancel
      </button>
      <button
        onclick={handleSave}
        disabled={!patternId.trim() || saving}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Creating...' : 'Create Pattern'}
      </button>
    </div>
  {/if}
</div>
