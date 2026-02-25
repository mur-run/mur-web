<script lang="ts">
  interface Props {
    code: string;
    language: string;
    description?: string;
  }

  let { code, language, description }: Props = $props();

  let copied = $state(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<div class="rounded-lg border border-slate-700 overflow-hidden">
  <div class="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 border-b border-slate-700/50">
    <span class="text-xs font-mono text-slate-400">{language}</span>
    <button
      onclick={copyCode}
      class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  </div>
  {#if description}
    <div class="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-700/30 bg-slate-800/40">
      {description}
    </div>
  {/if}
  <pre class="overflow-x-auto bg-slate-900/50 p-3 text-sm"><code class="text-slate-300 font-mono leading-relaxed">{code}</code></pre>
</div>
