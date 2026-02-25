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

    // Last 30 days activity
    const now = Date.now();
    const days = 30;
    const buckets = Array(days).fill(0);

    for (const p of patterns) {
      const updated = new Date(p.stats.updated).getTime();
      const daysAgo = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < days) {
        buckets[days - 1 - daysAgo]++;
      }
    }

    const maxCount = Math.max(...buckets, 1);
    const pad = { top: 8, bottom: 20, left: 4, right: 4 };
    const barW = (w - pad.left - pad.right) / days - 1;
    const chartH = h - pad.top - pad.bottom;

    for (let i = 0; i < days; i++) {
      const barH = Math.max((buckets[i] / maxCount) * chartH, buckets[i] > 0 ? 3 : 0);
      const x = pad.left + i * (barW + 1);
      const y = pad.top + chartH - barH;

      ctx.fillStyle = buckets[i] > 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(100, 116, 139, 0.15)';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 1);
      ctx.fill();
    }

    // X axis
    ctx.fillStyle = '#64748b';
    ctx.font = '8px system-ui';
    ctx.textAlign = 'center';
    const labels = ['30d', '20d', '10d', 'today'];
    const positions = [0, 10, 20, 29];
    for (let i = 0; i < labels.length; i++) {
      const x = pad.left + positions[i] * (barW + 1) + barW / 2;
      ctx.fillText(labels[i], x, h - 4);
    }
  }
</script>

<canvas bind:this={canvasEl} class="w-full" style="height: 100px"></canvas>
