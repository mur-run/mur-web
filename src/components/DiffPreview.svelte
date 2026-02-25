<script lang="ts">
  import type { Pattern } from '../lib/types';

  interface Props {
    original: Pattern;
    modified: Pattern;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let { original, modified, onconfirm, oncancel }: Props = $props();

  interface Change {
    field: string;
    before: string;
    after: string;
  }

  const changes = $derived.by(() => {
    const diffs: Change[] = [];
    const fields: (keyof Pattern)[] = ['description', 'tier', 'maturity', 'confidence'];

    for (const field of fields) {
      const before = String(original[field]);
      const after = String(modified[field]);
      if (before !== after) {
        diffs.push({ field, before, after });
      }
    }

    const origTriggers = original.triggers.join(', ');
    const modTriggers = modified.triggers.join(', ');
    if (origTriggers !== modTriggers) {
      diffs.push({ field: 'triggers', before: origTriggers, after: modTriggers });
    }

    const origTags = original.tags.join(', ');
    const modTags = modified.tags.join(', ');
    if (origTags !== modTags) {
      diffs.push({ field: 'tags', before: origTags, after: modTags });
    }

    if (original.examples.length !== modified.examples.length) {
      diffs.push({ field: 'examples', before: `${original.examples.length} examples`, after: `${modified.examples.length} examples` });
    }

    return diffs;
  });
</script>

{#if changes.length > 0}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
      <div class="border-b border-slate-700 px-6 py-4">
        <h3 class="text-lg font-semibold text-slate-100">Review Changes</h3>
        <p class="text-sm text-slate-400 mt-1">{changes.length} field{changes.length === 1 ? '' : 's'} modified</p>
      </div>

      <div class="max-h-80 overflow-y-auto px-6 py-4 space-y-4">
        {#each changes as change}
          <div class="rounded-lg border border-slate-700/50 overflow-hidden">
            <div class="bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 capitalize">{change.field}</div>
            <div class="grid grid-cols-2 divide-x divide-slate-700/50">
              <div class="p-3">
                <div class="text-[10px] uppercase tracking-wider text-rose-400/70 mb-1">Before</div>
                <div class="text-sm text-slate-400 break-words">{change.before}</div>
              </div>
              <div class="p-3">
                <div class="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">After</div>
                <div class="text-sm text-slate-200 break-words">{change.after}</div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
        <button onclick={oncancel} class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button onclick={onconfirm} class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  </div>
{/if}
