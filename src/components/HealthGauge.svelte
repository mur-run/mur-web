<script lang="ts">
  interface Props {
    score: number;
    size?: number;
    label?: string;
  }

  let { score, size = 80, label }: Props = $props();

  const radius = $derived((size - 8) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const strokeDashoffset = $derived(circumference - (score / 100) * circumference);
  const color = $derived(
    score >= 80 ? 'text-emerald-400' :
    score >= 60 ? 'text-amber-400' : 'text-rose-400'
  );
  const strokeColor = $derived(
    score >= 80 ? '#34d399' :
    score >= 60 ? '#fbbf24' : '#fb7185'
  );
</script>

<div class="flex flex-col items-center gap-1">
  <div class="relative" style="width: {size}px; height: {size}px">
    <svg viewBox="0 0 {size} {size}" class="transform -rotate-90" width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        class="text-slate-700/50"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={strokeDashoffset}
        class="transition-all duration-700"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-sm font-bold {color}">{score}</span>
    </div>
  </div>
  {#if label}
    <span class="text-[11px] text-slate-500 truncate max-w-full">{label}</span>
  {/if}
</div>
