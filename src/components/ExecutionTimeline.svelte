<script lang="ts">
  export interface TimelineStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    output?: string;
  }

  interface Props {
    steps: TimelineStep[];
    compact?: boolean;
  }

  let { steps, compact = false }: Props = $props();

  const statusConfig: Record<TimelineStep['status'], { icon: string; color: string; bg: string; line: string }> = {
    pending: { icon: '○', color: 'text-slate-500', bg: 'bg-slate-700/50', line: 'bg-slate-700/50' },
    running: { icon: '◉', color: 'text-emerald-400', bg: 'bg-emerald-500/20', line: 'bg-emerald-500/30' },
    success: { icon: '✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10', line: 'bg-emerald-500/50' },
    failed: { icon: '✗', color: 'text-rose-400', bg: 'bg-rose-500/10', line: 'bg-rose-500/50' },
    skipped: { icon: '–', color: 'text-slate-500', bg: 'bg-slate-700/30', line: 'bg-slate-700/30' },
  };

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
</script>

<div class="space-y-0">
  {#each steps as step, i}
    {@const cfg = statusConfig[step.status]}
    <div class="flex gap-3 {compact ? 'py-1.5' : 'py-2.5'}">
      <!-- Timeline connector -->
      <div class="flex flex-col items-center">
        <div class="flex h-6 w-6 items-center justify-center rounded-full {cfg.bg} shrink-0">
          {#if step.status === 'running'}
            <span class="text-xs {cfg.color} animate-pulse">{cfg.icon}</span>
          {:else}
            <span class="text-xs {cfg.color}">{cfg.icon}</span>
          {/if}
        </div>
        {#if i < steps.length - 1}
          <div class="w-0.5 flex-1 min-h-3 {cfg.line}"></div>
        {/if}
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 {compact ? '' : 'pb-2'}">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium {step.status === 'pending' || step.status === 'skipped' ? 'text-slate-500' : 'text-slate-200'}">{step.name}</span>
          {#if step.duration !== undefined}
            <span class="text-[11px] text-slate-500">{formatDuration(step.duration)}</span>
          {/if}
        </div>
        {#if step.output && !compact}
          <pre class="mt-1.5 rounded bg-slate-900 border border-slate-700/50 px-3 py-2 text-xs text-slate-400 overflow-x-auto font-mono whitespace-pre-wrap">{step.output}</pre>
        {/if}
      </div>
    </div>
  {/each}
</div>
