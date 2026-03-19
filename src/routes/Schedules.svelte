<script lang="ts">
  import { getWorkflows } from '../lib/api';
  import type { Workflow } from '../lib/types';

  let workflows = $state<Workflow[]>([]);
  let loading = $state(true);
  let error = $state('');

  interface ScheduledWorkflow extends Workflow {
    schedule?: string;
  }

  let scheduled = $derived<ScheduledWorkflow[]>(
    (workflows as ScheduledWorkflow[]).filter(w => w.schedule && !w.schedule.startsWith('#disabled'))
  );
  let disabled = $derived<ScheduledWorkflow[]>(
    (workflows as ScheduledWorkflow[]).filter(w => w.schedule?.startsWith('#disabled'))
  );

  $effect(() => {
    loadSchedules();
  });

  async function loadSchedules() {
    loading = true;
    error = '';
    try {
      workflows = await getWorkflows();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load workflows';
    }
    loading = false;
  }

  function describeCron(expr: string): string {
    const clean = expr.replace('#disabled: ', '');
    const parts = clean.split(/\s+/);
    if (parts.length < 5) return clean;
    const [min, hour, dom, month, dow] = parts;

    if (min === '*' && hour === '*') return '每分鐘';
    if (min === '0' && hour === '*') return '每小時';
    if (min !== '*' && hour === '*') return `每小時的第 ${min} 分鐘`;
    if (dom === '*' && month === '*' && dow === '*') return `每天 ${hour}:${min.padStart(2, '0')}`;
    if (dow === '1-5') return `平日 ${hour}:${min.padStart(2, '0')}`;
    return clean;
  }
</script>

<div class="space-y-6 max-w-4xl">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">📅 Schedules</h1>
      <p class="text-sm text-slate-400 mt-1">Automated workflow execution via cron</p>
    </div>
    <button
      onclick={loadSchedules}
      class="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
    >
      Refresh
    </button>
  </div>

  {#if loading}
    <div class="text-center text-slate-500 py-12">Loading schedules...</div>
  {:else if error}
    <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
  {:else}
    <!-- Active Schedules -->
    {#if scheduled.length > 0}
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">🔄 Active ({scheduled.length})</h2>
        <div class="space-y-2">
          {#each scheduled as wf}
            <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-200">{wf.name}</span>
                  <code class="text-xs bg-slate-700 text-emerald-400 px-1.5 py-0.5 rounded">{wf.schedule}</code>
                </div>
                <p class="text-xs text-slate-400 mt-1">
                  {describeCron(wf.schedule || '')}
                  {#if wf.description} — {wf.description}{/if}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="text-xs text-emerald-400">Active</span>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Disabled Schedules -->
    {#if disabled.length > 0}
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">⏸️ Disabled ({disabled.length})</h2>
        <div class="space-y-2">
          {#each disabled as wf}
            <div class="rounded-lg border border-slate-700/30 bg-slate-800/50 p-4 flex items-center justify-between opacity-60">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-300">{wf.name}</span>
                  <code class="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{wf.schedule?.replace('#disabled: ', '')}</code>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  {describeCron(wf.schedule || '')}
                  {#if wf.description} — {wf.description}{/if}
                </p>
              </div>
              <span class="text-xs text-slate-500">Paused</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- No Schedules -->
    {#if scheduled.length === 0 && disabled.length === 0}
      <div class="text-center py-12">
        <span class="text-4xl">📅</span>
        <p class="text-slate-400 mt-3">No scheduled workflows</p>
        <p class="text-xs text-slate-500 mt-1">
          Add a <code class="text-emerald-400">schedule</code> field to a workflow YAML, or use:<br>
          <code class="text-emerald-400 text-xs">mur workflow schedule set &lt;name&gt; "0 * * * *"</code>
        </p>
      </div>
    {/if}

    <!-- Help -->
    <section class="rounded-lg border border-slate-700/30 bg-slate-800/30 p-4 space-y-2">
      <h3 class="text-xs font-semibold text-slate-400 uppercase">Cron Quick Reference</h3>
      <div class="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div><code class="text-emerald-400/80">* * * * *</code> — Every minute</div>
        <div><code class="text-emerald-400/80">0 * * * *</code> — Every hour</div>
        <div><code class="text-emerald-400/80">0 9 * * *</code> — Daily at 9:00</div>
        <div><code class="text-emerald-400/80">0 9 * * 1-5</code> — Weekdays at 9:00</div>
        <div><code class="text-emerald-400/80">*/5 * * * *</code> — Every 5 min</div>
        <div><code class="text-emerald-400/80">0 0 1 * *</code> — Monthly 1st at 00:00</div>
      </div>
    </section>
  {/if}
</div>
