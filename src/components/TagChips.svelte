<script lang="ts">
  interface Props {
    tags: string[];
    suggestions?: string[];
    readonly?: boolean;
    onchange?: (tags: string[]) => void;
  }

  let { tags = $bindable(), suggestions = [], readonly: isReadonly = false, onchange }: Props = $props();

  let inputValue = $state('');
  let showSuggestions = $state(false);

  const filteredSuggestions = $derived(
    suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s))
  );

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      tags = [...tags, trimmed];
      onchange?.(tags);
    }
    inputValue = '';
    showSuggestions = false;
  }

  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
    onchange?.(tags);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }
</script>

<div class="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/25 transition-colors">
  {#each tags as tag}
    <span class="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
      {tag}
      {#if !isReadonly}
        <button onclick={() => removeTag(tag)} class="text-slate-500 hover:text-slate-300 ml-0.5">&times;</button>
      {/if}
    </span>
  {/each}
  {#if !isReadonly}
    <div class="relative flex-1 min-w-[120px]">
      <input
        type="text"
        bind:value={inputValue}
        onkeydown={handleKeydown}
        onfocus={() => showSuggestions = true}
        onblur={() => setTimeout(() => showSuggestions = false, 200)}
        placeholder={tags.length === 0 ? 'Add tags...' : ''}
        class="w-full bg-transparent py-0.5 text-sm text-slate-200 placeholder-slate-500 outline-none"
      />
      {#if showSuggestions && filteredSuggestions.length > 0 && inputValue}
        <div class="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
          {#each filteredSuggestions.slice(0, 6) as suggestion}
            <button
              onmousedown={(e) => { e.preventDefault(); addTag(suggestion); }}
              class="block w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700"
            >
              {suggestion}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
