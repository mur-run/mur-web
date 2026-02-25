<script lang="ts">
  import type { Pattern, Tier, CodeExample } from '../lib/types';
  import TagChips from './TagChips.svelte';
  import ConfidenceSlider from './ConfidenceSlider.svelte';
  import CodeBlock from './CodeBlock.svelte';
  import MaturityBadge from './MaturityBadge.svelte';

  interface Props {
    pattern: Pattern;
    onchange: (pattern: Pattern) => void;
  }

  let { pattern = $bindable(), onchange }: Props = $props();

  let allTriggers = $state<string[]>([
    'error handling', 'typescript', 'svelte', 'runes', 'api', 'rate limit',
    'css', 'container queries', 'git', 'validation', 'testing', 'database',
    'async', 'streaming', 'dark mode', 'tailwind',
  ]);
  let allTags = $state<string[]>([
    'typescript', 'javascript', 'svelte', 'frontend', 'backend', 'api',
    'css', 'testing', 'database', 'git', 'patterns', 'best-practices',
    'performance', 'security', 'workflow', 'devtools',
  ]);

  let editingExample = $state<number | null>(null);
  let newExampleLang = $state('typescript');
  let newExampleCode = $state('');
  let newExampleDesc = $state('');

  const tiers: Tier[] = ['Session', 'Project', 'Global'];

  function update<K extends keyof Pattern>(field: K, value: Pattern[K]) {
    pattern = { ...pattern, [field]: value };
    onchange(pattern);
  }

  function addExample() {
    if (!newExampleCode.trim()) return;
    const newEx: CodeExample = {
      language: newExampleLang,
      code: newExampleCode,
      description: newExampleDesc || undefined,
    };
    update('examples', [...pattern.examples, newEx]);
    newExampleLang = 'typescript';
    newExampleCode = '';
    newExampleDesc = '';
  }

  function removeExample(idx: number) {
    update('examples', pattern.examples.filter((_, i) => i !== idx));
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
  <!-- Main editor -->
  <div class="lg:col-span-2 space-y-6">
    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
      <textarea
        id="description"
        rows="4"
        value={pattern.description}
        oninput={(e) => update('description', (e.target as HTMLTextAreaElement).value)}
        class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 resize-none transition-colors"
      ></textarea>
    </div>

    <!-- Triggers -->
    <div>
      <span class="block text-sm font-medium text-slate-300 mb-1.5">Triggers</span>
      <TagChips
        bind:tags={pattern.triggers}
        suggestions={allTriggers}
        onchange={(t) => update('triggers', t)}
      />
    </div>

    <!-- Tags -->
    <div>
      <span class="block text-sm font-medium text-slate-300 mb-1.5">Tags</span>
      <TagChips
        bind:tags={pattern.tags}
        suggestions={allTags}
        onchange={(t) => update('tags', t)}
      />
    </div>

    <!-- Tier -->
    <div>
      <span class="block text-sm font-medium text-slate-300 mb-1.5">Tier</span>
      <div class="flex gap-2">
        {#each tiers as tier}
          <button
            onclick={() => update('tier', tier)}
            class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors {pattern.tier === tier ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}"
          >
            {tier}
          </button>
        {/each}
      </div>
    </div>

    <!-- Confidence -->
    <div>
      <span class="block text-sm font-medium text-slate-300 mb-1.5">Confidence</span>
      <ConfidenceSlider
        bind:value={pattern.confidence}
        onchange={(v) => update('confidence', v)}
      />
    </div>

    <!-- Examples -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-slate-300">Examples ({pattern.examples.length})</span>
      </div>

      <div class="space-y-3">
        {#each pattern.examples as example, idx}
          <div class="relative group">
            <CodeBlock code={example.code} language={example.language} description={example.description} />
            <button
              onclick={() => removeExample(idx)}
              class="absolute top-2 right-12 opacity-0 group-hover:opacity-100 rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-400 hover:bg-rose-500/30 transition-all"
            >
              Remove
            </button>
          </div>
        {/each}
      </div>

      <!-- Add example -->
      <div class="mt-4 rounded-lg border border-dashed border-slate-700 p-4 space-y-3">
        <div class="flex gap-3">
          <div class="flex-1">
            <input
              type="text"
              placeholder="Description (optional)"
              bind:value={newExampleDesc}
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <select
            bind:value={newExampleLang}
            class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-emerald-500/50 transition-colors"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="svelte">Svelte</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
            <option value="sql">SQL</option>
            <option value="bash">Bash</option>
            <option value="yaml">YAML</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <textarea
          rows="6"
          placeholder="Paste code here..."
          bind:value={newExampleCode}
          class="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-mono text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500/50 resize-none transition-colors"
        ></textarea>
        <button
          onclick={addExample}
          disabled={!newExampleCode.trim()}
          class="rounded-lg bg-slate-700 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add Example
        </button>
      </div>
    </div>
  </div>

  <!-- Sidebar -->
  <div class="space-y-6">
    <!-- Maturity -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
      <span class="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Maturity</span>
      <MaturityBadge maturity={pattern.maturity} />
    </div>

    <!-- Stats -->
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 space-y-3">
      <span class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Statistics</span>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-500">Injections</span>
          <span class="text-slate-200 font-mono">{pattern.stats.injections}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Last Used</span>
          <span class="text-slate-300 text-xs">{formatDate(pattern.stats.last_used)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Created</span>
          <span class="text-slate-300 text-xs">{formatDate(pattern.stats.created)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Updated</span>
          <span class="text-slate-300 text-xs">{formatDate(pattern.stats.updated)}</span>
        </div>
      </div>
    </div>

    <!-- Related patterns -->
    {#if pattern.related && pattern.related.length > 0}
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
        <span class="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Related Patterns</span>
        <div class="space-y-1">
          {#each pattern.related as rel}
            <a href="/patterns/{rel}" class="block rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-emerald-400 transition-colors">
              {rel}
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
