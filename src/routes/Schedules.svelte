<script lang="ts">
  import {
    getSchedules,
    createOrUpdateSchedule,
    deleteScheduleById,
    setScheduleEnabled,
    type ApiSchedule,
  } from '../lib/api';
  import { describeCron, getNextRun, formatNextRun, formatLastRun } from '../lib/schedule-parser';
  import { showToast } from '../lib/toast';
  import ScheduleModal from '../components/ScheduleModal.svelte';

  // ─── State ───────────────────────────────────────────────────────────────────

  let schedules = $state<ApiSchedule[]>([]);
  let loading = $state(true);
  let error = $state('');
  let showModal = $state(false);
  let editingSchedule = $state<ApiSchedule | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let savingId = $state<string | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  let activeSchedules = $derived(schedules.filter(s => s.enabled));
  let disabledSchedules = $derived(schedules.filter(s => !s.enabled));

  // ─── Load ────────────────────────────────────────────────────────────────────

  $effect(() => {
    loadSchedules();
  });

  async function loadSchedules() {
    loading = true;
    error = '';
    try {
      schedules = await getSchedules();
    } catch (e: any) {
      error = e?.message ?? 'Failed to load schedules';
    }
    loading = false;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function nextRunLabel(s: ApiSchedule): string {
    if (!s.enabled) return '—';
    const d = s.next_run_at ? new Date(s.next_run_at) : getNextRun(s.cron_expr);
    return d ? formatNextRun(d) : '—';
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function handleToggle(s: ApiSchedule) {
    const newEnabled = !s.enabled;
    savingId = s.id;

    // Optimistic update
    const idx = schedules.findIndex(x => x.id === s.id);
    if (idx >= 0) schedules[idx] = { ...schedules[idx], enabled: newEnabled };

    try {
      await setScheduleEnabled(s.id, newEnabled);
      showToast(newEnabled ? 'Schedule enabled' : 'Schedule paused', 'success');
    } catch (e) {
      if (idx >= 0) schedules[idx] = { ...schedules[idx], enabled: s.enabled };
      showToast('Failed to update schedule', 'error');
    }
    savingId = null;
  }

  async function handleDeleteConfirm(id: string) {
    confirmDeleteId = null;
    savingId = id;

    const idx = schedules.findIndex(x => x.id === id);
    const prev = idx >= 0 ? schedules[idx] : null;
    if (idx >= 0) schedules = schedules.filter(x => x.id !== id);

    try {
      await deleteScheduleById(id);
      showToast('Schedule removed', 'success');
    } catch (e) {
      if (prev) schedules = [...schedules, prev];
      showToast('Failed to remove schedule', 'error');
    }
    savingId = null;
  }

  async function handleSave(workflowName: string, cron: string, enabled: boolean) {
    showModal = false;
    const prevSchedule = editingSchedule;
    editingSchedule = null;
    savingId = workflowName;

    try {
      const saved = await createOrUpdateSchedule({ workflow_name: workflowName, cron_expr: cron, enabled });
      // Replace or add in list
      const idx = schedules.findIndex(x => x.id === saved.id || x.workflow_name === workflowName);
      if (idx >= 0) {
        schedules[idx] = saved;
      } else {
        schedules = [...schedules, saved];
      }
      showToast('Schedule saved', 'success');
    } catch (e: any) {
      showToast(e?.message ?? 'Failed to save schedule', 'error');
      await loadSchedules();
    }
    savingId = null;
  }

  function openCreate() {
    editingSchedule = null;
    showModal = true;
  }

  function openEdit(s: ApiSchedule) {
    editingSchedule = s;
    showModal = true;
  }
</script>

<div class="space-y-6 max-w-4xl">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Schedules</h1>
      <p class="text-sm text-slate-400 mt-1">Automate workflows with cron-based triggers</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={loadSchedules}
        class="rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
        title="Refresh"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button
        onclick={openCreate}
        class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Schedule
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-16 text-slate-500">
      <svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      Loading schedules…
    </div>

  {:else if error}
    <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>

  {:else}
    <!-- Active Schedules -->
    {#if activeSchedules.length > 0}
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-300">Active ({activeSchedules.length})</h2>
        </div>
        <div class="space-y-2">
          {#each activeSchedules as s (s.id)}
            <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 transition-all hover:border-slate-600/70 {savingId === s.id ? 'opacity-60' : ''}">
              <div class="flex items-start gap-3">
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-slate-200">{s.workflow_name}</span>
                    <code class="rounded bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-emerald-400">{s.cron_expr}</code>
                  </div>
                  <div class="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span class="text-emerald-400/80 font-medium">{describeCron(s.cron_expr)}</span>
                    {#if s.last_run_at}
                      <span>Last: {formatLastRun(s.last_run_at)}</span>
                    {:else}
                      <span>Never run</span>
                    {/if}
                    <span class="text-slate-600">Next: {nextRunLabel(s)}</span>
                    {#if s.run_count}
                      <span>{s.run_count} runs</span>
                    {/if}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Toggle -->
                  <button
                    onclick={() => handleToggle(s)}
                    disabled={savingId === s.id}
                    role="switch"
                    aria-checked={true}
                    title="Disable schedule"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-emerald-500 transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed"
                  >
                    <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 translate-x-4"></span>
                  </button>

                  <!-- Edit -->
                  <button
                    onclick={() => openEdit(s)}
                    title="Edit schedule"
                    class="rounded-md p-1.5 text-slate-500 hover:bg-slate-700 hover:text-slate-300 transition-colors"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete -->
                  {#if confirmDeleteId === s.id}
                    <div class="flex items-center gap-1">
                      <button
                        onclick={() => handleDeleteConfirm(s.id)}
                        class="rounded-md px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onclick={() => confirmDeleteId = null}
                        class="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  {:else}
                    <button
                      onclick={() => confirmDeleteId = s.id}
                      title="Remove schedule"
                      class="rounded-md p-1.5 text-slate-600 hover:bg-slate-700 hover:text-red-400 transition-colors"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Disabled Schedules -->
    {#if disabledSchedules.length > 0}
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full bg-slate-500"></span>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Paused ({disabledSchedules.length})</h2>
        </div>
        <div class="space-y-2">
          {#each disabledSchedules as s (s.id)}
            <div class="rounded-lg border border-slate-700/30 bg-slate-800/50 p-4 opacity-70 transition-all hover:opacity-90 hover:border-slate-700/50 {savingId === s.id ? 'opacity-40' : ''}">
              <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-slate-300">{s.workflow_name}</span>
                    <code class="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-mono text-slate-500">{s.cron_expr}</code>
                    <span class="rounded-full bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">paused</span>
                  </div>
                  <div class="mt-2 flex items-center gap-4 text-xs text-slate-600">
                    <span>{describeCron(s.cron_expr)}</span>
                    {#if s.last_run_at}
                      <span>Last: {formatLastRun(s.last_run_at)}</span>
                    {/if}
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <!-- Toggle (off state) -->
                  <button
                    onclick={() => handleToggle(s)}
                    disabled={savingId === s.id}
                    role="switch"
                    aria-checked={false}
                    title="Enable schedule"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-600 transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed"
                  >
                    <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 translate-x-0"></span>
                  </button>

                  <!-- Edit -->
                  <button
                    onclick={() => openEdit(s)}
                    title="Edit schedule"
                    class="rounded-md p-1.5 text-slate-600 hover:bg-slate-700 hover:text-slate-300 transition-colors"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete -->
                  {#if confirmDeleteId === s.id}
                    <div class="flex items-center gap-1">
                      <button
                        onclick={() => handleDeleteConfirm(s.id)}
                        class="rounded-md px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onclick={() => confirmDeleteId = null}
                        class="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  {:else}
                    <button
                      onclick={() => confirmDeleteId = s.id}
                      title="Remove schedule"
                      class="rounded-md p-1.5 text-slate-600 hover:bg-slate-700 hover:text-red-400 transition-colors"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Empty state -->
    {#if activeSchedules.length === 0 && disabledSchedules.length === 0}
      <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/50 py-16 text-center">
        <div class="mb-4 rounded-full border border-slate-700/50 bg-slate-800/60 p-4">
          <svg class="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-slate-300">No scheduled workflows</h3>
        <p class="mt-1 text-xs text-slate-500 max-w-xs">
          Create a schedule to automate your workflows — no YAML editing required.
        </p>
        <button
          onclick={openCreate}
          class="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create your first schedule
        </button>
      </div>
    {/if}

    <!-- Cron quick reference -->
    <section class="rounded-lg border border-slate-700/30 bg-slate-800/30 p-4 space-y-2">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Cron Reference</h3>
      <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
        <div><code class="text-emerald-400/70">* * * * *</code> — Every minute</div>
        <div><code class="text-emerald-400/70">0 * * * *</code> — Every hour</div>
        <div><code class="text-emerald-400/70">*/5 * * * *</code> — Every 5 min</div>
        <div><code class="text-emerald-400/70">0 9 * * *</code> — Daily at 9:00</div>
        <div><code class="text-emerald-400/70">0 9 * * 1-5</code> — Weekdays 9:00</div>
        <div><code class="text-emerald-400/70">0 0 1 * *</code> — Monthly, 1st</div>
      </div>
    </section>
  {/if}
</div>

<!-- Create/Edit modal -->
{#if showModal}
  <ScheduleModal
    existingSchedules={schedules}
    editSchedule={editingSchedule}
    onSave={handleSave}
    onCancel={() => { showModal = false; editingSchedule = null; }}
  />
{/if}
