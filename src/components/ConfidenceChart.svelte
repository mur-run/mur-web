<script lang="ts">
  import type { Pattern } from '../lib/types';

  interface Props { patterns: Pattern[]; }
  let { patterns }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);

  $effect(() => {
    if (!canvasEl || patterns.length === 0) return;
    draw();
  });

  function draw() {
    const canvas = canvasEl!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = canvas.clientWidth * 2;
    const H = canvas.height = canvas.clientHeight * 2;
    ctx.scale(2, 2);
    const w = W / 2, h = H / 2;
    ctx.clearRect(0, 0, w, h);

    // Histogram: 10 buckets (0-10%, 10-20%, ..., 90-100%)
    const buckets = Array(10).fill(0);
    for (const p of patterns) {
      if (p.archived) continue;
      const idx = Math.min(Math.floor(p.confidence * 10), 9);
      buckets[idx]++;
    }
    const maxCount = Math.max(...buckets, 1);

    const pad = { top: 8, bottom: 20, left: 4, right: 4 };
    const barW = (w - pad.left - pad.right) / 10 - 2;
    const chartH = h - pad.top - pad.bottom;

    for (let i = 0; i < 10; i++) {
      const barH = (buckets[i] / maxCount) * chartH;
      const x = pad.left + i * (barW + 2);
      const y = pad.top + chartH - barH;

      // Color gradient: red → yellow → green
      const pct = i / 9;
      const r = pct < 0.5 ? 220 : Math.round(220 - (pct - 0.5) * 2 * 180);
      const g = pct < 0.5 ? Math.round(pct * 2 * 200) : 200;
      ctx.fillStyle = `rgb(${r}, ${g}, 80)`;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();

      // Label
      if (buckets[i] > 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(String(buckets[i]), x + barW / 2, y - 3);
      }
    }

    // X axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '8px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < 10; i += 2) {
      const x = pad.left + i * (barW + 2) + barW / 2;
      ctx.fillText(`${i * 10}%`, x, h - 4);
    }
  }
</script>

<canvas bind:this={canvasEl} class="w-full" style="height: 120px"></canvas>
