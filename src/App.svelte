<script lang="ts">
  import { detectBackend, getDataSource } from './lib/api';
  import { connect, disconnect, onEvent, isConnected } from './lib/realtime';
  import { getCurrentRoute, navigate, matchRoute } from './lib/router';
  import Dashboard from './routes/Dashboard.svelte';
  import Patterns from './routes/Patterns.svelte';
  import PatternEditor from './routes/PatternEditor.svelte';
  import NewPattern from './routes/NewPattern.svelte';
  import Import from './routes/Import.svelte';
  import Workflows from './routes/Workflows.svelte';
  import Settings from './routes/Settings.svelte';
  import Search from './routes/Search.svelte';
  import Graph from './routes/Graph.svelte';
  import Toast from './components/Toast.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import { showToast } from './lib/toast';

  let sidebarCollapsed = $state(false);
  let searchQuery = $state('');
  let dataSource = $state<'local' | 'cloud' | 'demo'>('demo');
  let wsConnected = $state(false);
  let currentRoute = $state(getCurrentRoute());

  $effect(() => {
    detectBackend().then(source => {
      dataSource = source;
      if (source === 'local') {
        connect('http://localhost:3847');
      } else if (source === 'cloud') {
        connect('https://mur-server.fly.dev');
      }
    });

    const unsub = onEvent((evt) => {
      wsConnected = isConnected();
      currentRoute = getCurrentRoute();
      // Show toast for real-time events
      const labels: Record<string, string> = {
        'pattern:created': '✨ Pattern created',
        'pattern:updated': '📝 Pattern updated',
        'pattern:deleted': '🗑️ Pattern deleted',
        'workflow:created': '✨ Workflow created',
        'workflow:updated': '📝 Workflow updated',
        'workflow:deleted': '🗑️ Workflow deleted',
      };
      const label = labels[evt.type];
      if (label) showToast(`${label}: ${evt.id}`, 'success');
    });

    const onHashChange = () => {
      currentRoute = getCurrentRoute();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      unsub();
      disconnect();
    };
  });

  const dataSourceLabel = $derived(
    dataSource === 'local' ? 'Local' : dataSource === 'cloud' ? 'Cloud' : 'Demo'
  );
  const dataSourceIcon = $derived(
    dataSource === 'local' ? '🟢' : dataSource === 'cloud' ? '☁️' : '👀'
  );

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'grid' },
    { path: '/patterns', label: 'Patterns', icon: 'layers' },
    { path: '/import', label: 'Import', icon: 'upload' },
    { path: '/graph', label: 'Graph', icon: 'share' },
    { path: '/workflows', label: 'Workflows', icon: 'git-branch' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  function getNavIcon(icon: string): string {
    const icons: Record<string, string> = {
      grid: 'M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5zM4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z',
      layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      'git-branch': 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a9 9 0 0 1-9 9',
      upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
      share: 'M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
      settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    };
    return icons[icon] || '';
  }

  function isActive(itemPath: string): boolean {
    if (itemPath === '/') return currentRoute === '/' || currentRoute === '';
    return currentRoute.startsWith(itemPath);
  }

  // Route matching
  const routeParams = $derived(matchRoute('/patterns/:id', currentRoute));
  const searchParams = $derived(matchRoute('/search/:query', currentRoute));
</script>

<div class="flex h-screen overflow-hidden bg-slate-900">
  <!-- Mobile sidebar overlay -->
  {#if !sidebarCollapsed}
    <div
      class="fixed inset-0 z-20 bg-black/50 md:hidden"
      onclick={() => sidebarCollapsed = true}
      onkeydown={() => {}}
      role="button"
      tabindex="-1"
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside class="flex flex-col border-r border-slate-700/50 bg-slate-950 transition-all duration-200
    {sidebarCollapsed ? 'w-16' : 'w-56'}
    max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-30
    {sidebarCollapsed ? 'max-md:-translate-x-full' : 'max-md:translate-x-0'}"
  >
    <div class="flex h-14 items-center gap-2 border-b border-slate-700/50 px-4">
      {#if !sidebarCollapsed}
        <span class="text-lg font-bold text-emerald-400">🧠 MUR</span>
        <span class="text-xs text-slate-500">Dashboard</span>
      {:else}
        <span class="text-lg font-bold text-emerald-400">🧠</span>
      {/if}
    </div>

    <nav class="flex-1 space-y-1 p-2">
      {#each navItems as item}
        <a
          href="#{item.path}"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {isActive(item.path) ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}"
        >
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d={getNavIcon(item.icon)} />
          </svg>
          {#if !sidebarCollapsed}
            <span>{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <button
      onclick={() => sidebarCollapsed = !sidebarCollapsed}
      aria-label="Toggle sidebar"
      class="flex items-center justify-center border-t border-slate-700/50 p-3 text-slate-500 hover:text-slate-300 transition-colors"
    >
      <svg class="h-4 w-4 transition-transform {sidebarCollapsed ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  </aside>

  <!-- Main content -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Top bar -->
    <header class="flex h-14 items-center gap-4 border-b border-slate-700/50 bg-slate-900/80 px-4 md:px-6 backdrop-blur-sm">
      <button
        onclick={() => sidebarCollapsed = false}
        class="md:hidden text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Open menu"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
      </button>
      <div class="relative flex-1 max-w-md">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search patterns & workflows..."
          bind:value={searchQuery}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' && searchQuery.trim()) navigate('/search/' + encodeURIComponent(searchQuery.trim())); }}
          class="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-10 pr-12 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
        />
        <kbd class="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-600">⌘K</kbd>
      </div>

      <div class="flex items-center gap-3">
        {#if dataSource !== 'demo' && wsConnected}
          <span class="flex items-center gap-1.5 text-xs text-emerald-400" title="Real-time connected">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live
          </span>
        {/if}
        <div class="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs">
          <span>{dataSourceIcon}</span>
          <span class="text-slate-400">{dataSourceLabel}</span>
        </div>
      </div>
    </header>

    <!-- Content area -->
    <main class="flex-1 overflow-auto p-6">
      {#if currentRoute === '/' || currentRoute === ''}
        <Dashboard />
      {:else if currentRoute === '/patterns'}
        <Patterns />
      {:else if currentRoute === '/patterns/new'}
        <NewPattern />
      {:else if currentRoute === '/import'}
        <Import />
      {:else if currentRoute === '/graph'}
        <Graph />
      {:else if currentRoute === '/workflows'}
        <Workflows />
      {:else if currentRoute === '/settings'}
        <Settings />
      {:else if searchParams}
        <Search query={decodeURIComponent(searchParams.query)} />
      {:else if routeParams}
        <PatternEditor id={routeParams.id} />
      {:else}
        <div class="flex items-center justify-center h-full text-slate-500">
          <p>Page not found. <a href="#/" class="text-emerald-400 hover:underline">Go to Dashboard</a></p>
        </div>
      {/if}
    </main>
  </div>
</div>

<Toast />
<CommandPalette />
