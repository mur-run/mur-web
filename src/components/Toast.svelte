<script lang="ts">
  import { subscribeToasts, type ToastItem } from '../lib/toast';

  let toasts = $state<ToastItem[]>([]);

  $effect(() => {
    const unsub = subscribeToasts(t => toasts = t);
    return unsub;
  });
</script>

{#if toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
    {#each toasts as toast (toast.id)}
      <div
        class="pointer-events-auto rounded-lg px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm transition-all
          {toast.type === 'success' ? 'bg-emerald-500/90 text-white' :
           toast.type === 'error' ? 'bg-red-500/90 text-white' :
           'bg-slate-700/90 text-slate-200 border border-slate-600/50'}"
        style="animation: slideIn 0.2s ease-out"
      >
        <span class="mr-1.5">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : '•'}</span>
        {toast.message}
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
