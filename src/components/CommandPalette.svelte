<script lang="ts">
  import { getPatterns, getWorkflows } from '../lib/api';
  import { navigate } from '../lib/router';
  import type { Pattern, Workflow } from '../lib/types';

  let open = $state(false);
  let query = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);
  let selectedIdx = $state(0);
  let patterns = $state<Pattern[]>([]);
  let workflows = $state<Workflow[]>([]);

  interface Result { label: string; desc: string; href: string; icon: string; }

  const results = $derived.by(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: Result[] = [];

    for (const p of patterns) {
      if (p.id.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))) {
        items.push({ label: p.id, desc: p.description.slice(0, 80), href: `/patterns/${p.id}`, icon: '◆' });
      }
      if (items.length >= 8) break;
    }

    for (const w of workflows) {
      if (w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)) {
        items.push({ label: w.name, desc: w.description.slice(0, 80), href: '/workflows', icon: '⑃' });
      }
      if (items.length >= 10) break;
    }

    // Nav shortcuts
    const navItems = [
      { label: 'Dashboard', href: '/', icon: '▦' },
      { label: 'Patterns', href: '/patterns', icon: '◇' },
      { label: 'Graph', href: '/graph', icon: '⊛' },
      { label: 'Workflows', href: '/workflows', icon: '⑃' },
      { label: 'Import', href: '/import', icon: '↑' },
      { label: 'Settings', href: '/settings', icon: '⚙' },
    ];
    for (const n of navItems) {
      if (n.label.toLowerCase().includes(q)) {
        items.push({ ...n, desc: `Go to ${n.label}` });
      }
    }

    return items.slice(0, 10);
  });

  $effect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open = !open;
        if (open) {
          query = '';
          selectedIdx = 0;
          Promise.all([getPatterns(), getWorkflows()]).then(([p, w]) => {
            patterns = p;
            workflows = w;
          });
          setTimeout(() => inputEl?.focus(), 50);
        }
      }
      if (e.key === 'Escape' && open) {
        open = false;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, results.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); }
    else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      go(results[selectedIdx].href);
    }
  }

  function go(href: string) {
    navigate(href);
    open = false;
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    onclick={() => open = false}
    onkeydown={() => {}}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Palette -->
  <div class="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-lg">
    <div class="rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl overflow-hidden">
      <div class="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
        <svg class="h-4 w-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          onkeydown={handleKeydown}
          type="text"
          placeholder="Search patterns, workflows, pages…"
          class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
        />
        <kbd class="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-700">ESC</kbd>
      </div>

      {#if results.length > 0}
        <ul class="max-h-72 overflow-auto py-1">
          {#each results as item, i}
            <li>
              <button
                onclick={() => go(item.href)}
                onmouseenter={() => selectedIdx = i}
                class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors
                  {i === selectedIdx ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/50'}"
              >
                <span class="text-sm w-4 text-center opacity-60">{item.icon}</span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">{item.label}</div>
                  <div class="text-[11px] text-slate-500 truncate">{item.desc}</div>
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {:else if query.trim()}
        <div class="px-4 py-6 text-center text-sm text-slate-500">No results</div>
      {:else}
        <div class="px-4 py-4 text-center text-xs text-slate-500">Type to search…</div>
      {/if}
    </div>
  </div>
{/if}
