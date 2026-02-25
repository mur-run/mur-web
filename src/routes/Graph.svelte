<script lang="ts">
  import { getPatterns } from '../lib/api';
  import type { Pattern } from '../lib/types';

  let patterns = $state<Pattern[]>([]);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let hoveredNode = $state<string | null>(null);
  let selectedNode = $state<string | null>(null);
  let animId = 0;

  interface Node {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    maturity: string;
    confidence: number;
    tags: string[];
  }

  interface Edge {
    source: string;
    target: string;
    weight: number;
  }

  let nodes: Node[] = [];
  let edges: Edge[] = [];

  const maturityColors: Record<string, string> = {
    Draft: '#94a3b8',
    Emerging: '#facc15',
    Stable: '#34d399',
    Canonical: '#818cf8',
  };

  $effect(() => {
    getPatterns().then(p => {
      patterns = p.filter(p => !p.archived);
      buildGraph();
    });
  });

  $effect(() => {
    if (canvasEl && nodes.length > 0) {
      startSimulation();
    }
    return () => { cancelAnimationFrame(animId); };
  });

  function buildGraph() {
    const w = 800, h = 600;
    nodes = patterns.map((p, i) => ({
      id: p.id,
      x: w / 2 + (Math.random() - 0.5) * 300,
      y: h / 2 + (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
      maturity: p.maturity,
      confidence: p.confidence,
      tags: p.tags,
    }));

    edges = [];
    // Build edges from related field
    for (const p of patterns) {
      if (p.related) {
        for (const rid of p.related) {
          if (nodes.find(n => n.id === rid)) {
            edges.push({ source: p.id, target: rid, weight: 0.8 });
          }
        }
      }
    }
    // Build edges from shared tags (2+ shared tags = edge)
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const shared = patterns[i].tags.filter(t => patterns[j].tags.includes(t));
        if (shared.length >= 2) {
          const key = `${patterns[i].id}-${patterns[j].id}`;
          if (!edges.find(e => (e.source === patterns[i].id && e.target === patterns[j].id) || (e.source === patterns[j].id && e.target === patterns[i].id))) {
            edges.push({ source: patterns[i].id, target: patterns[j].id, weight: shared.length / 5 });
          }
        }
      }
    }
  }

  function startSimulation() {
    const canvas = canvasEl!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = canvas.clientWidth;
    const H = canvas.height = canvas.clientHeight;

    let mouseX = 0, mouseY = 0;

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      // Find hovered node
      hoveredNode = null;
      for (const n of nodes) {
        const r = 6 + n.confidence * 12;
        if (Math.hypot(n.x - mouseX, n.y - mouseY) < r + 4) {
          hoveredNode = n.id;
          break;
        }
      }
    };

    canvas.onclick = () => {
      selectedNode = hoveredNode;
    };

    function tick() {
      // Force simulation
      const alpha = 0.3;

      // Center gravity
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.001;
        n.vy += (H / 2 - n.y) * 0.001;
      }

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction (edges)
      for (const e of edges) {
        const a = nodes.find(n => n.id === e.source)!;
        const b = nodes.find(n => n.id === e.target)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const force = (dist - 100) * 0.005 * e.weight;
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Apply velocity
      for (const n of nodes) {
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx * alpha;
        n.y += n.vy * alpha;
        // Bounds
        n.x = Math.max(30, Math.min(W - 30, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Edges
      for (const e of edges) {
        const a = nodes.find(n => n.id === e.source)!;
        const b = nodes.find(n => n.id === e.target)!;
        const isHighlight = hoveredNode === a.id || hoveredNode === b.id || selectedNode === a.id || selectedNode === b.id;
        ctx.strokeStyle = isHighlight ? 'rgba(52, 211, 153, 0.4)' : 'rgba(100, 116, 139, 0.15)';
        ctx.lineWidth = isHighlight ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const r = 6 + n.confidence * 12;
        const isHover = hoveredNode === n.id;
        const isSelected = selectedNode === n.id;
        const color = maturityColors[n.maturity] || '#94a3b8';

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHover || isSelected ? color : color + '99';
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        if (isHover || isSelected || nodes.length <= 15) {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.id.replace(/-/g, ' '), n.x, n.y + r + 14);
        }
      }

      animId = requestAnimationFrame(tick);
    }

    tick();
  }

  const selectedPattern = $derived(
    selectedNode ? patterns.find(p => p.id === selectedNode) : null
  );
</script>

<div class="space-y-4 h-full flex flex-col">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Pattern Graph</h1>
      <p class="text-sm text-slate-400 mt-1">{nodes.length} nodes, {edges.length} edges — connected by shared tags &amp; relations</p>
    </div>
    <div class="flex items-center gap-4 text-xs">
      {#each Object.entries(maturityColors) as [label, color]}
        <span class="flex items-center gap-1.5">
          <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:{color}"></span>
          <span class="text-slate-400">{label}</span>
        </span>
      {/each}
    </div>
  </div>

  <div class="flex-1 flex gap-4 min-h-0">
    <div class="flex-1 rounded-lg border border-slate-700/50 bg-slate-950 overflow-hidden">
      <canvas
        bind:this={canvasEl}
        class="w-full h-full cursor-crosshair"
        style="min-height: 500px"
      ></canvas>
    </div>

    {#if selectedPattern}
      <div class="w-72 shrink-0 rounded-lg border border-slate-700/50 bg-slate-800 p-4 space-y-3 overflow-auto">
        <h3 class="text-sm font-semibold text-emerald-400">{selectedPattern.id}</h3>
        <p class="text-xs text-slate-400">{selectedPattern.description}</p>

        <div>
          <span class="text-[10px] text-slate-500 uppercase">Maturity</span>
          <p class="text-xs text-slate-300">{selectedPattern.maturity} · {selectedPattern.tier}</p>
        </div>

        <div>
          <span class="text-[10px] text-slate-500 uppercase">Confidence</span>
          <div class="mt-1 h-1.5 rounded-full bg-slate-700">
            <div class="h-full rounded-full bg-emerald-500" style="width: {selectedPattern.confidence * 100}%"></div>
          </div>
          <p class="text-[10px] text-slate-500 mt-0.5">{Math.round(selectedPattern.confidence * 100)}%</p>
        </div>

        <div>
          <span class="text-[10px] text-slate-500 uppercase">Tags</span>
          <div class="flex flex-wrap gap-1 mt-1">
            {#each selectedPattern.tags as tag}
              <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{tag}</span>
            {/each}
          </div>
        </div>

        {#if selectedPattern.related?.length}
          <div>
            <span class="text-[10px] text-slate-500 uppercase">Related</span>
            <div class="space-y-1 mt-1">
              {#each selectedPattern.related as r}
                <button
                  onclick={() => selectedNode = r}
                  class="block text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >{r}</button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="pt-2">
          <a href="#/patterns/{selectedPattern.id}" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Edit pattern →</a>
        </div>
      </div>
    {/if}
  </div>
</div>
