<script lang="ts">
  import { getSessions, deleteSession, bulkDeleteSessions, updateSession, getSession } from '../lib/api';
  import { navigate } from '../lib/router';
  import type { Session, SessionDetail, SessionEvent } from '../lib/types';
  import { t, subscribe as i18nSubscribe } from '../lib/i18n';

  let sessions = $state<Session[]>([]);
  let loading = $state(true);
  let error = $state('');
  let _i18n = $state(0);

  // Search & sort
  let search = $state('');
  let sortBy = $state<'date' | 'events' | 'size'>('date');

  // Bulk select
  let selectedIds = $state<Set<string>>(new Set());
  let selectMode = $state(false);
  let bulkConfirm = $state(false);

  // Single delete confirm
  let deleteConfirmId = $state<string | null>(null);

  // Inline title editing
  let editingTitleId = $state<string | null>(null);
  let editingTitleValue = $state('');

  // Session detail view
  let detailSession = $state<SessionDetail | null>(null);
  let detailLoading = $state(false);
  let expandedEvents = $state<Set<number>>(new Set());

  $effect(() => {
    loadSessions();
    const unsub = i18nSubscribe(() => _i18n++);
    return unsub;
  });

  async function loadSessions() {
    loading = true;
    error = '';
    try {
      sessions = await getSessions();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load sessions';
    } finally {
      loading = false;
    }
  }

  // Filtered & sorted sessions
  let filtered = $derived.by(() => {
    void _i18n;
    let list = sessions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.source || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'events') return b.event_count - a.event_count;
      if (sortBy === 'size') return b.file_size - a.file_size;
      return new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime();
    });
    return list;
  });

  function shortId(id: string): string {
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDuration(started?: string, stopped?: string): string {
    if (!started || !stopped) return '--';
    const ms = new Date(stopped).getTime() - new Date(started).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  function sourceColor(source?: string): string {
    switch (source) {
      case 'claude-code': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'codex': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'cursor': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function selectAll() {
    selectedIds = new Set(filtered.map(s => s.id));
  }

  function selectNone() {
    selectedIds = new Set();
  }

  async function handleDelete(id: string) {
    try {
      await deleteSession(id);
      sessions = sessions.filter(s => s.id !== id);
      deleteConfirmId = null;
      if (detailSession?.id === id) detailSession = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete session';
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteSessions(ids);
      const idSet = new Set(ids);
      sessions = sessions.filter(s => !idSet.has(s.id));
      selectedIds = new Set();
      bulkConfirm = false;
      selectMode = false;
      if (detailSession && idSet.has(detailSession.id)) detailSession = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete sessions';
    }
  }

  function startEditTitle(session: Session) {
    editingTitleId = session.id;
    editingTitleValue = session.title || '';
  }

  async function saveTitle(id: string) {
    try {
      await updateSession(id, { title: editingTitleValue });
      sessions = sessions.map(s => s.id === id ? { ...s, title: editingTitleValue } : s);
      editingTitleId = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to update title';
    }
  }

  function cancelEditTitle() {
    editingTitleId = null;
    editingTitleValue = '';
  }

  async function openDetail(session: Session) {
    if (selectMode) {
      toggleSelect(session.id);
      return;
    }
    detailLoading = true;
    expandedEvents = new Set();
    try {
      detailSession = await getSession(session.id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load session detail';
    } finally {
      detailLoading = false;
    }
  }

  function closeDetail() {
    detailSession = null;
  }

  function toggleExpand(idx: number) {
    const next = new Set(expandedEvents);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    expandedEvents = next;
  }

  function eventIcon(type: string): string {
    switch (type) {
      case 'user': return '\u{1F464}';
      case 'assistant': return '\u{1F916}';
      case 'tool_call': return '\u{1F527}';
      case 'tool_result': return '\u{1F4CB}';
      default: return '\u{25CF}';
    }
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

  function relativeTimestamp(event: SessionEvent, firstTimestamp: number): string {
    const delta = Math.floor((event.timestamp - firstTimestamp) / 1000);
    const mins = Math.floor(delta / 60);
    const secs = delta % 60;
    return `+${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function isLong(content: string): boolean {
    return content.length > 300 || content.split('\n').length > 3;
  }

  function truncateContent(content: string): string {
    const lines = content.split('\n');
    if (lines.length > 3) return lines.slice(0, 3).join('\n') + '\n...';
    if (content.length > 300) return content.slice(0, 300) + '...';
    return content;
  }

  function parseToolDescription(content: string): string | null {
    try {
      const parsed = JSON.parse(content);
      if (parsed?.description) return parsed.description;
    } catch { /* not JSON */ }
    return null;
  }
</script>

{#if detailSession}
  <!-- Session Detail View -->
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <button
        onclick={closeDetail}
        class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
      >
        {void _i18n, t('common.back')}
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold text-slate-100 truncate">
          {detailSession.title || t('session.title')}
          <span class="font-mono text-emerald-400 text-base ml-2">{shortId(detailSession.id)}</span>
        </h1>
        <div class="flex items-center gap-3 mt-1 text-sm text-slate-400">
          {#if detailSession.source}
            <span class="rounded-full border px-2 py-0.5 text-xs {sourceColor(detailSession.source)}">{detailSession.source}</span>
          {/if}
          <span>{detailSession.event_count} {t('sessions.events')}</span>
          <span>{formatDuration(detailSession.started_at, detailSession.stopped_at)}</span>
          <span>{formatDate(detailSession.modified_at)}</span>
        </div>
      </div>
      <button
        onclick={() => navigate(`/sessions/${detailSession!.id}/review`)}
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
      >
        {t('sessions.review')}
      </button>
    </div>

    {#if detailSession.tools_used && detailSession.tools_used.length > 0}
      <div class="flex flex-wrap gap-1.5">
        {#each detailSession.tools_used as tool}
          <span class="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">{tool}</span>
        {/each}
      </div>
    {/if}

    {#if detailSession.events.length > 0}
      <div class="relative space-y-3">
        <div class="absolute left-5 top-0 bottom-0 w-px bg-slate-700/50"></div>

        {#each detailSession.events as event, idx}
          {@const expanded = expandedEvents.has(idx)}
          {@const long = isLong(event.content)}
          {@const firstTs = detailSession.events[0]?.timestamp ?? event.timestamp}
          {@const toolDesc = event.type === 'tool_call' ? parseToolDescription(event.content) : null}

          <div class="relative pl-12">
            <div class="absolute left-2.5 top-3.5 w-5 h-5 rounded-full flex items-center justify-center text-xs {typeColor(event.type)}">
              {eventIcon(event.type)}
            </div>

            <div class="rounded-lg border-l-2 {typeColor(event.type)} bg-slate-800/50 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="rounded px-1.5 py-0.5 text-[10px] font-medium {typeBadgeColor(event.type)}">
                  {event.type}
                </span>
                {#if event.tool}
                  <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    {event.tool}
                  </span>
                {/if}
                <span class="text-[10px] text-slate-500 ml-auto font-mono">{relativeTimestamp(event, firstTs)}</span>
              </div>

              {#if toolDesc}
                <p class="text-xs text-slate-400 mb-1 italic">{toolDesc}</p>
              {/if}

              {#if event.type === 'tool_call' || event.type === 'tool_result'}
                <pre class="text-xs text-slate-300 bg-slate-900/50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words {long && !expanded ? 'max-h-20 overflow-hidden' : ''}">{long && !expanded ? truncateContent(event.content) : event.content}</pre>
              {:else}
                <div class="text-sm text-slate-300 whitespace-pre-wrap break-words {long && !expanded ? 'max-h-20 overflow-hidden' : ''}">
                  {long && !expanded ? truncateContent(event.content) : event.content}
                </div>
              {/if}

              {#if long}
                <button
                  onclick={() => toggleExpand(idx)}
                  class="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {expanded ? t('session.collapse') : t('session.showAll', { chars: event.content.length.toLocaleString() })}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-16 text-slate-500">
        <p class="text-sm">{t('session.noEvents')}</p>
      </div>
    {/if}
  </div>
{:else}
  <!-- Session List View -->
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-100">{void _i18n, t('sessions.title')}</h1>
        <p class="text-sm text-slate-400 mt-1">
          {#if !loading && !error}
            {t('sessions.recordings', { count: sessions.length })}
          {:else if error}
            <span class="text-rose-400">{t('sessions.errorLoading')}</span>
          {:else}
            {t('sessions.loading')}
          {/if}
        </p>
      </div>
      <div class="flex items-center gap-2">
        {#if !loading && sessions.length > 0}
          <button
            onclick={() => { selectMode = !selectMode; if (!selectMode) { selectedIds = new Set(); bulkConfirm = false; } }}
            class="rounded-lg border px-3 py-1.5 text-sm transition-colors {selectMode ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
          >
            {t('sessions.select')}
          </button>
        {/if}
        <button
          onclick={loadSessions}
          class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
        >
          {t('sessions.refresh')}
        </button>
      </div>
    </div>

    {#if error}
      <div class="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
        <p class="text-sm text-rose-400">{error}</p>
        <p class="text-xs text-slate-500 mt-1">{t('sessions.makeSureRunning')}</p>
      </div>
    {/if}

    <!-- Search, Sort, Bulk Actions -->
    {#if !loading && sessions.length > 0}
      <div class="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder={t('sessions.searchPlaceholder')}
          bind:value={search}
          class="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
        />
        <div class="flex items-center gap-1 text-xs text-slate-500">
          <span>Sort:</span>
          {#each ['date', 'events', 'size'] as s}
            <button
              onclick={() => sortBy = s as typeof sortBy}
              class="rounded px-2 py-1 transition-colors {sortBy === s ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-200'}"
            >
              {t(`sessions.sort${s[0].toUpperCase()}${s.slice(1)}` as any)}
            </button>
          {/each}
        </div>
      </div>

      {#if selectMode}
        <div class="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2">
          <span class="text-sm text-slate-300">{t('sessions.selected', { count: selectedIds.size })}</span>
          <button onclick={selectAll} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('patterns.all')}</button>
          <button onclick={selectNone} class="text-xs text-slate-400 hover:text-slate-300 transition-colors">{t('patterns.none')}</button>
          {#if selectedIds.size > 0}
            {#if bulkConfirm}
              <span class="text-xs text-rose-400 ml-auto">{t('sessions.bulkDeleteConfirm', { count: selectedIds.size })}</span>
              <button onclick={handleBulkDelete} class="rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-500 transition-colors">{t('common.confirm')}</button>
              <button onclick={() => bulkConfirm = false} class="text-xs text-slate-400 hover:text-slate-300 transition-colors">{t('common.cancel')}</button>
            {:else}
              <button onclick={() => bulkConfirm = true} class="ml-auto rounded bg-rose-600/80 px-3 py-1 text-xs text-white hover:bg-rose-600 transition-colors">
                {t('sessions.bulkDelete', { count: selectedIds.size })}
              </button>
            {/if}
          {/if}
        </div>
      {/if}
    {/if}

    {#if loading}
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each Array(6) as _}
          <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 animate-pulse">
            <div class="h-4 w-3/4 rounded bg-slate-700 mb-3"></div>
            <div class="h-3 w-1/2 rounded bg-slate-700 mb-2"></div>
            <div class="flex gap-2 mt-3">
              <div class="h-5 w-16 rounded-full bg-slate-700"></div>
              <div class="h-5 w-12 rounded-full bg-slate-700"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if filtered.length > 0}
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each filtered as session (session.id)}
          <div
            class="group rounded-lg border bg-slate-800 p-4 transition-all cursor-pointer hover:border-slate-600 hover:bg-slate-800/80 {selectMode && selectedIds.has(session.id) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700/50'}"
            onclick={() => openDetail(session)}
            onkeydown={(e) => { if (e.key === 'Enter') openDetail(session); }}
            tabindex="0"
            role="button"
          >
            <!-- Top: checkbox + title + delete -->
            <div class="flex items-start gap-2 mb-2">
              {#if selectMode}
                <input
                  type="checkbox"
                  checked={selectedIds.has(session.id)}
                  onclick={(e) => { e.stopPropagation(); toggleSelect(session.id); }}
                  class="mt-1 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 h-4 w-4 cursor-pointer"
                />
              {/if}
              <div class="flex-1 min-w-0">
                {#if editingTitleId === session.id}
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      bind:value={editingTitleValue}
                      onkeydown={(e) => { if (e.key === 'Enter') saveTitle(session.id); if (e.key === 'Escape') cancelEditTitle(); }}
                      class="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                    />
                    <button onclick={() => saveTitle(session.id)} class="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                    <button onclick={cancelEditTitle} class="text-xs text-slate-400 hover:text-slate-300">Esc</button>
                  </div>
                {:else}
                  <h3
                    class="text-sm font-semibold text-slate-100 truncate hover:text-emerald-400 transition-colors"
                    ondblclick={(e) => { e.stopPropagation(); startEditTitle(session); }}
                    title="Double-click to edit title"
                  >
                    {session.title || shortId(session.id)}
                  </h3>
                {/if}
              </div>
              <!-- Delete button -->
              {#if deleteConfirmId === session.id}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()}>
                  <button onclick={() => handleDelete(session.id)} class="rounded bg-rose-600 px-2 py-0.5 text-[10px] text-white hover:bg-rose-500 transition-colors">{t('common.confirm')}</button>
                  <button onclick={() => deleteConfirmId = null} class="text-[10px] text-slate-400 hover:text-slate-300">{t('common.cancel')}</button>
                </div>
              {:else}
                <button
                  onclick={(e) => { e.stopPropagation(); deleteConfirmId = session.id; }}
                  class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all text-xs"
                  title={t('common.delete')}
                >
                  ×
                </button>
              {/if}
            </div>

            <!-- Source badge + ID -->
            <div class="flex items-center gap-2 mb-3">
              {#if session.source}
                <span class="rounded-full border px-2 py-0.5 text-[10px] font-medium {sourceColor(session.source)}">{session.source}</span>
              {/if}
              <span class="text-[10px] font-mono text-slate-500">{shortId(session.id)}</span>
            </div>

            <!-- Tool chips -->
            {#if session.tools_used && session.tools_used.length > 0}
              <div class="flex flex-wrap gap-1 mb-3">
                {#each session.tools_used as tool}
                  <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{tool}</span>
                {/each}
              </div>
            {/if}

            <!-- Stats row -->
            <div class="flex items-center gap-3 text-[11px] text-slate-500">
              <span title={t('sessions.events')}>{session.event_count} events</span>
              {#if session.user_turns != null}
                <span title={t('sessions.userTurns')}>{session.user_turns} {t('sessions.userTurns')}</span>
              {/if}
              <span>{formatDuration(session.started_at, session.stopped_at)}</span>
              <span class="ml-auto">{formatDate(session.modified_at)}</span>
            </div>
          </div>
        {/each}
      </div>
    {:else if search.trim()}
      <div class="flex flex-col items-center justify-center py-16 text-slate-500">
        <p class="text-sm">No sessions match "{search}"</p>
        <p class="text-xs mt-1">Try a different search term</p>
      </div>
    {:else if !error}
      <div class="flex flex-col items-center justify-center py-16 text-slate-500">
        <svg class="h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p class="text-sm">{t('sessions.noRecordings')}</p>
        <p class="text-xs mt-1 font-mono text-slate-600">{t('sessions.noRecordingsHint')}</p>
      </div>
    {/if}
  </div>

  <!-- Delete confirm modal backdrop -->
  {#if bulkConfirm}
    <!-- handled inline -->
  {/if}
{/if}

{#if detailLoading}
  <div class="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
    <div class="rounded-lg border border-slate-700 bg-slate-800 p-6 animate-pulse">
      <div class="h-4 w-48 rounded bg-slate-700 mb-3"></div>
      <div class="h-3 w-32 rounded bg-slate-700"></div>
    </div>
  </div>
{/if}
