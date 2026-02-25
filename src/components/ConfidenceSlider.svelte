<script lang="ts">
  interface Props {
    value: number;
    readonly?: boolean;
    onchange?: (value: number) => void;
  }

  let { value = $bindable(), readonly: isReadonly = false, onchange }: Props = $props();

  const color = $derived(
    value >= 0.8 ? 'emerald' : value >= 0.5 ? 'amber' : 'rose'
  );

  const bgClass = $derived(
    color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
  );

  const textClass = $derived(
    color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-rose-400'
  );

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = parseFloat(target.value);
    onchange?.(value);
  }
</script>

<div class="flex items-center gap-3">
  {#if isReadonly}
    <div class="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
      <div class="h-full rounded-full transition-all duration-300 {bgClass}" style="width: {value * 100}%"></div>
    </div>
  {:else}
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      {value}
      oninput={handleInput}
      class="flex-1 h-2 appearance-none rounded-full bg-slate-700 accent-emerald-500
             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
    />
  {/if}
  <span class="min-w-[3ch] text-right text-sm font-mono font-medium {textClass}">
    {(value * 100).toFixed(0)}%
  </span>
</div>
