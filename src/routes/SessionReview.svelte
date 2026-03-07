<script lang="ts">
  import { getSession } from '../lib/api';
  import { navigate } from '../lib/router';
  import type { SessionDetail, SessionEvent } from '../lib/types';

  let { id }: { id: string } = $props();

  let session = $state<SessionDetail | null>(null);
  let loading = $state(true);
  let error = $state('');
  let expandedEvents = $state<Set<number>>(new Set());

  $effect(() => {
    loadSession();
  });

  async function loadSession() {
    loading = true;
    error = '';
    try {
      session = await getSession(id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load session';
    } finally {
      loading = false;
    }
  }

  function shortId(sid: string): string {
    return sid.length > 8 ? sid.slice(0, 8) : sid;
  }

  function formatTimestamp(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  }

  function typeColor(type: string): string {
    switch (type) {
      case 'user': return 'border-blue-500 bg-blue-500/10';
      case 'assistant': return 'border-emerald-500 bg-emerald-500/10';
      case 'tool_call': return 'border-amber-500 bg-amber-500/10';
      case 'tool_result': return 'border-slate-500 bg-slate-500/10';
      default: return 'border-slate-600 bg-slate-800';
    }
  }

  function typeBadgeColor(type: string): string {
    switch (type) {
      case 'user': return 'bg-blue-500/20 text-blue-400';
      case 'assistant': return 'bg-emerald-500/20 text-emerald-400';
      case 'tool_call': return 'bg-amber-500/20 text-amber-400';
      case 'tool_result': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-700 text-slate-400';
    }
  }

  function isToolEvent(type: string): boolean {
    return type === 'tool_call' || type === 'tool_result';
  }

  function isLong(content: string): boolean {
    return content.length > 500;
  }

  function toggleExpand(idx: number) {
    const next = new Set(expandedEvents);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    expandedEvents = next;
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <button
      onclick={() => navigate('/sessions')}
      class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
    >
      ← Back
    </button>
    <div>
      <h1 class="text-2xl font-bold text-slate-100">
        Session <span class="font-mono text-emerald-400">{shortId(id)}</span>
      </h1>
      {#if session}
        <p class="text-sm text-slate-400 mt-0.5">
          {session.event_count} events · {new Date(session.modified_at).toLocaleString()}
        </p>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
      <p class="text-sm text-rose-400">{error}</p>
    </div>
  {/if}

  {#if loading}
    <div class="space-y-3">
      {#each Array(8) as _}
        <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 animate-pulse">
          <div class="h-3 w-24 rounded bg-slate-700"></div>
          <div class="mt-2 h-3 w-full rounded bg-slate-700"></div>
          <div class="mt-1 h-3 w-2/3 rounded bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else if session && session.events.length > 0}
    <!-- Timeline -->
    <div class="relative space-y-3">
      <!-- Vertical timeline line -->
      <div class="absolute left-5 top-0 bottom-0 w-px bg-slate-700/50"></div>

      {#each session.events as event, idx}
        {@const expanded = expandedEvents.has(idx)}
        {@const long = isLong(event.content)}
        {@const toolEvent = isToolEvent(event.type)}

        <div class="relative pl-12">
          <!-- Timeline dot -->
          <div class="absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 {typeColor(event.type)}"></div>

          <div class="rounded-lg border-l-2 {typeColor(event.type)} bg-slate-800/50 p-4">
            <!-- Event header -->
            <div class="flex items-center gap-2 mb-2">
              <span class="rounded px-1.5 py-0.5 text-[10px] font-medium {typeBadgeColor(event.type)}">
                {event.type}
              </span>
              {#if event.tool}
                <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                  {event.tool}
                </span>
              {/if}
              <span class="text-[10px] text-slate-500 ml-auto">{formatTimestamp(event.timestamp)}</span>
            </div>

            <!-- Content -->
            {#if toolEvent}
              <pre class="text-xs text-slate-300 bg-slate-900/50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words {long && !expanded ? 'max-h-32 overflow-hidden' : ''}">{long && !expanded ? event.content.slice(0, 500) + '...' : event.content}</pre>
            {:else}
              <div class="text-sm text-slate-300 whitespace-pre-wrap break-words {long && !expanded ? 'max-h-32 overflow-hidden' : ''}">
                {long && !expanded ? event.content.slice(0, 500) + '...' : event.content}
              </div>
            {/if}

            {#if long}
              <button
                onclick={() => toggleExpand(idx)}
                class="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {expanded ? 'Collapse' : `Show all (${event.content.length.toLocaleString()} chars)`}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if session}
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <p class="text-sm">This session has no events</p>
    </div>
  {/if}
</div>
