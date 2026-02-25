<script lang="ts">
  import type { Maturity } from '../lib/types';

  interface Props {
    maturity: Maturity;
    size?: 'sm' | 'md';
  }

  let { maturity, size = 'md' }: Props = $props();

  const config: Record<Maturity, { icon: string; color: string; bg: string }> = {
    Draft: { icon: '\u270F\uFE0F', color: 'text-slate-400', bg: 'bg-slate-700/50' },
    Emerging: { icon: '\u{1F331}', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    Stable: { icon: '\u2705', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    Canonical: { icon: '\u{1F451}', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  };

  const c = $derived(config[maturity]);
  const sizeClasses = $derived(size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs');
</script>

<span class="inline-flex items-center gap-1 rounded-md font-medium {c.bg} {c.color} {sizeClasses}">
  <span class="text-xs">{c.icon}</span>
  {maturity}
</span>
