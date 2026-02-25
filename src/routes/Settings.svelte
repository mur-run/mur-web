<script lang="ts">
  import { getDataSource, setDataSource, detectBackend, getPatterns, getWorkflows } from '../lib/api';
  import type { DataSource } from '../lib/types';

  let currentSource = $state<DataSource>(getDataSource());
  let localUrl = $state('http://localhost:3847');
  let cloudUrl = $state('https://mur-server.fly.dev');
  let testStatus = $state<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  let testMessage = $state('');
  let patternCount = $state(0);
  let workflowCount = $state(0);

  $effect(() => {
    refreshCounts();
  });

  async function refreshCounts() {
    const [patterns, workflows] = await Promise.all([getPatterns(), getWorkflows()]);
    patternCount = patterns.length;
    workflowCount = workflows.length;
  }

  async function switchSource(source: DataSource) {
    setDataSource(source);
    currentSource = source;
    testStatus = 'idle';
    await refreshCounts();
  }

  async function testConnection() {
    testStatus = 'testing';
    testMessage = '';
    const url = currentSource === 'local' ? localUrl : cloudUrl;
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        testStatus = 'ok';
        testMessage = 'Connected successfully';
      } else {
        testStatus = 'fail';
        testMessage = `HTTP ${res.status}`;
      }
    } catch (e: unknown) {
      testStatus = 'fail';
      testMessage = e instanceof Error ? e.message : 'Connection failed';
    }
  }

  async function exportData() {
    const [patterns, workflows] = await Promise.all([getPatterns(), getWorkflows()]);
    const data = { patterns, workflows, exportedAt: new Date().toISOString(), version: '2.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mur-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        // For now just log — real import would call createPattern/createWorkflow for each
        console.log('Import data:', data);
        alert(`Loaded ${data.patterns?.length ?? 0} patterns and ${data.workflows?.length ?? 0} workflows from export.`);
      } catch {
        alert('Invalid JSON file');
      }
    };
    input.click();
  }

  const sourceItems: { key: DataSource; label: string; icon: string; desc: string }[] = [
    { key: 'demo', label: 'Demo', icon: '👀', desc: 'Sample data for exploring the UI' },
    { key: 'local', label: 'Local', icon: '🟢', desc: 'Connect to mur serve on localhost' },
    { key: 'cloud', label: 'Cloud', icon: '☁️', desc: 'Connect to mur-server.fly.dev' },
  ];
</script>

<div class="space-y-8 max-w-2xl">
  <div>
    <h1 class="text-2xl font-bold text-slate-100">Settings</h1>
    <p class="text-sm text-slate-400 mt-1">Configure data source, export data, and more</p>
  </div>

  <!-- Data Source -->
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Data Source</h2>
    <div class="grid grid-cols-3 gap-3">
      {#each sourceItems as item}
        <button
          onclick={() => switchSource(item.key)}
          class="rounded-lg border p-4 text-left transition-all {currentSource === item.key
            ? 'border-emerald-500/50 bg-emerald-500/10'
            : 'border-slate-700/50 bg-slate-800 hover:border-slate-600'}"
        >
          <div class="text-lg mb-1">{item.icon}</div>
          <div class="text-sm font-medium {currentSource === item.key ? 'text-emerald-400' : 'text-slate-200'}">{item.label}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Connection -->
  {#if currentSource !== 'demo'}
    <section class="space-y-3">
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Connection</h2>
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 space-y-3">
        <div>
          <label class="text-xs text-slate-400 block mb-1">
            {currentSource === 'local' ? 'Local Backend URL' : 'Cloud Backend URL'}
          </label>
          {#if currentSource === 'local'}
            <input
              type="text"
              bind:value={localUrl}
              class="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors font-mono"
            />
          {:else}
            <input
              type="text"
              bind:value={cloudUrl}
              class="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors font-mono"
            />
          {/if}
        </div>
        <div class="flex items-center gap-3">
          <button
            onclick={testConnection}
            disabled={testStatus === 'testing'}
            class="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
          </button>
          {#if testStatus === 'ok'}
            <span class="text-sm text-emerald-400">✓ {testMessage}</span>
          {:else if testStatus === 'fail'}
            <span class="text-sm text-red-400">✗ {testMessage}</span>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  <!-- Stats -->
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Current Data</h2>
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
        <div class="text-2xl font-bold text-slate-100">{patternCount}</div>
        <div class="text-xs text-slate-400 mt-1">Patterns</div>
      </div>
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
        <div class="text-2xl font-bold text-slate-100">{workflowCount}</div>
        <div class="text-xs text-slate-400 mt-1">Workflows</div>
      </div>
    </div>
  </section>

  <!-- Export / Import -->
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Data Management</h2>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 flex gap-3">
      <button
        onclick={exportData}
        class="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
      >
        📥 Export JSON
      </button>
      <button
        onclick={importData}
        class="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
      >
        📤 Import JSON
      </button>
    </div>
  </section>

  <!-- Theme (placeholder) -->
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Theme</h2>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4">
      <p class="text-sm text-slate-500">Theme customization coming soon. Currently using dark mode.</p>
    </div>
  </section>

  <!-- About -->
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">About</h2>
    <div class="rounded-lg border border-slate-700/50 bg-slate-800 p-4 space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">🧠</span>
        <span class="text-sm font-semibold text-slate-200">MUR</span>
        <span class="text-xs text-slate-500">v2.0</span>
      </div>
      <p class="text-xs text-slate-400">Continuous learning system for AI assistants. Captures, evolves, and injects knowledge patterns.</p>
      <div class="flex gap-4 pt-1">
        <a href="https://github.com/mur-run/mur" target="_blank" rel="noopener" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">GitHub</a>
        <a href="https://mur-server.fly.dev" target="_blank" rel="noopener" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Server</a>
        <a href="https://github.com/mur-run/mur#readme" target="_blank" rel="noopener" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Documentation</a>
      </div>
    </div>
  </section>
</div>
