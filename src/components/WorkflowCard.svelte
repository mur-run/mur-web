<script lang="ts">
  import HealthGauge from './HealthGauge.svelte';

  interface Props {
    name: string;
    description?: string;
    healthScore: number;
    lastRun?: string;
    status?: 'idle' | 'running' | 'failed';
    onrun?: () => void;
    onclick?: () => void;
  }

  let { name, description = '', healthScore, lastRun, status = 'idle', onrun, onclick }: Props = $props();

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const statusConfig = $derived({
    idle: { label: 'Idle', dot: 'bg-slate-500' },
    running: { label: 'Running', dot: 'bg-emerald-400 animate-pulse' },
    failed: { label: 'Failed', dot: 'bg-rose-400' },
  }[status]);
</script>

<div
  class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 transition-all hover:border-slate-600 {onclick ? 'cursor-pointer' : ''}"
  onclick={onclick}
  onkeydown={onclick ? (e) => { if (e.key === 'Enter') onclick?.() } : undefined}
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
>
  <div class="flex items-start gap-4">
    <HealthGauge score={healthScore} size={56} />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-slate-200 truncate">{name}</h3>
        <span class="flex items-center gap-1.5 rounded-full bg-slate-700/50 px-2 py-0.5 text-[11px] text-slate-400">
          <span class="inline-block w-1.5 h-1.5 rounded-full {statusConfig.dot}"></span>
          {statusConfig.label}
        </span>
      </div>
      {#if description}
        <p class="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
      {/if}
      <div class="flex items-center gap-3 mt-2">
        {#if lastRun}
          <span class="text-[11px] text-slate-500">Last run: {formatDate(lastRun)}</span>
        {:else}
          <span class="text-[11px] text-slate-500">Never run</span>
        {/if}
      </div>
    </div>
    {#if onrun}
      <button
        onclick={(e) => { e.stopPropagation(); onrun?.(); }}
        disabled={status === 'running'}
        class="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {status === 'running' ? 'Running...' : 'Run'}
      </button>
    {/if}
  </div>
</div>
