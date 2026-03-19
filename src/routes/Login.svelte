<script lang="ts">
  import { redirectToLogin } from '../lib/api';

  // Extract the target redirect from the URL
  const hashStr = window.location.hash;
  const qIdx = hashStr.indexOf('?');
  const params = qIdx >= 0 ? new URLSearchParams(hashStr.slice(qIdx)) : new URLSearchParams();
  const targetRoute = params.get('redirect') || '/';

  // Provider metadata (icons + colors)
  const providerMeta: Record<string, { name: string; icon: string; color: string }> = {
    github: { name: 'GitHub', icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z', color: 'bg-[#24292f] hover:bg-[#1b1f23]' },
    gitlab: { name: 'GitLab', icon: 'M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.387 9.452.045 13.587a.924.924 0 00.331 1.023L12 23.054l11.624-8.443a.92.92 0 00.331-1.024', color: 'bg-[#fc6d26] hover:bg-[#e65a1c]' },
    bitbucket: { name: 'Bitbucket', icon: 'M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z', color: 'bg-[#0052cc] hover:bg-[#0747a6]' },
    gitee: { name: 'Gitee', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z', color: 'bg-[#c71d23] hover:bg-[#a5171c]' },
  };

  // Fallback for unknown providers
  const defaultMeta = { name: '', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', color: 'bg-slate-600 hover:bg-slate-500' };

  // Fetch providers from server
  let providers = $state<string[]>([]);
  let loading = $state(true);

  $effect(() => {
    fetch('https://mur-server.fly.dev/api/v1/core/auth/providers', { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(data => {
        providers = data.providers || [];
        loading = false;
      })
      .catch(() => {
        // Fallback to default providers if server is unreachable
        providers = ['github', 'gitlab', 'bitbucket', 'gitee'];
        loading = false;
      });
  });

  function login(provider: string) {
    redirectToLogin(targetRoute, provider);
  }

  function getMeta(id: string) {
    return providerMeta[id] || { ...defaultMeta, name: id.charAt(0).toUpperCase() + id.slice(1) };
  }
</script>

<div class="flex items-center justify-center h-full">
  <div class="w-full max-w-sm space-y-8">
    <!-- Logo -->
    <div class="text-center">
      <span class="text-4xl">🧠</span>
      <h1 class="mt-3 text-2xl font-bold text-slate-100">MUR Dashboard</h1>
      <p class="mt-2 text-sm text-slate-400">Sign in to access your sessions, workflows, and patterns</p>
    </div>

    <!-- Provider buttons -->
    <div class="space-y-3">
      {#if loading}
        <div class="text-center text-slate-500 py-4">Loading...</div>
      {:else}
        {#each providers as id}
          {@const meta = getMeta(id)}
          <button
            onclick={() => login(id)}
            class="w-full flex items-center justify-center gap-3 rounded-lg {meta.color} px-4 py-3 text-sm font-medium text-white transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d={meta.icon} />
            </svg>
            Continue with {meta.name}
          </button>
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <p class="text-center text-xs text-slate-500">
      By signing in, you agree to MUR's
      <a href="https://mur.run/terms" target="_blank" class="text-emerald-400 hover:underline">Terms</a>
      and
      <a href="https://mur.run/privacy" target="_blank" class="text-emerald-400 hover:underline">Privacy Policy</a>
    </p>
  </div>
</div>
