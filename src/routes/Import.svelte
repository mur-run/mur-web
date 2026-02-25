<script lang="ts">
  import { navigate } from '../lib/router';
  import { createPattern } from '../lib/api';
  import type { Pattern, Maturity, Tier } from '../lib/types';
  import MaturityBadge from '../components/MaturityBadge.svelte';

  let dragging = $state(false);
  let fileName = $state('');
  let fileContent = $state('');
  let parsedPatterns = $state<Partial<Pattern>[]>([]);
  let parseError = $state('');
  let importing = $state(false);
  let importedCount = $state(0);

  const acceptedExtensions = ['.yaml', '.yml', '.md', '.toml', '.cursorrules'];

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function handleDragLeave() {
    dragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
  }

  function processFile(file: File) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedExtensions.includes(ext)) {
      parseError = `Unsupported file type: ${ext}. Accepted: ${acceptedExtensions.join(', ')}`;
      return;
    }

    fileName = file.name;
    parseError = '';
    parsedPatterns = [];

    const reader = new FileReader();
    reader.onload = () => {
      fileContent = reader.result as string;
      try {
        if (ext === '.yaml' || ext === '.yml') {
          parsedPatterns = parseYaml(fileContent);
        } else if (ext === '.md') {
          parsedPatterns = parseMarkdown(fileContent);
        } else if (ext === '.toml') {
          parsedPatterns = parseToml(fileContent);
        } else if (ext === '.cursorrules') {
          parsedPatterns = parseCursorRules(fileContent);
        }
        if (parsedPatterns.length === 0) {
          parseError = 'No patterns detected in this file. Check the format.';
        }
      } catch (err) {
        parseError = `Parse error: ${err instanceof Error ? err.message : String(err)}`;
      }
    };
    reader.readAsText(file);
  }

  function parseYaml(content: string): Partial<Pattern>[] {
    const patterns: Partial<Pattern>[] = [];
    // Split on document separators or detect single pattern
    const docs = content.split(/^---$/m).filter(d => d.trim());

    for (const doc of docs) {
      const p: Partial<Pattern> = { examples: [], triggers: [], tags: [] };
      const lines = doc.split('\n');
      let currentKey = '';
      let listTarget: string[] | null = null;

      for (const line of lines) {
        const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
        if (kvMatch) {
          const [, key, val] = kvMatch;
          currentKey = key;
          listTarget = null;
          const trimVal = val.trim();

          if (key === 'id' && trimVal) p.id = trimVal;
          else if (key === 'description' && trimVal && trimVal !== '|') p.description = trimVal;
          else if (key === 'tier' && trimVal) p.tier = trimVal as Tier;
          else if (key === 'maturity' && trimVal) p.maturity = trimVal as Maturity;
          else if (key === 'confidence' && trimVal) p.confidence = parseFloat(trimVal);
          else if (key === 'triggers') listTarget = p.triggers!;
          else if (key === 'tags') listTarget = p.tags!;
        } else if (line.match(/^\s+-\s+/)) {
          const item = line.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '').trim();
          if (currentKey === 'triggers' && p.triggers) p.triggers.push(item);
          else if (currentKey === 'tags' && p.tags) p.tags.push(item);
        } else if (line.match(/^\s{2}\S/) && currentKey === 'description') {
          p.description = (p.description || '') + line.trim() + ' ';
        }
      }

      if (p.description) p.description = p.description.trim();
      if (!p.id && p.description) {
        p.id = p.description.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      }
      if (p.id || p.description) {
        if (!p.tier) p.tier = 'Project';
        if (!p.maturity) p.maturity = 'Draft';
        if (!p.confidence) p.confidence = 0.5;
        patterns.push(p);
      }
    }
    return patterns;
  }

  function parseMarkdown(content: string): Partial<Pattern>[] {
    const patterns: Partial<Pattern>[] = [];
    // Split by H1 or H2 headings
    const sections = content.split(/^(?=#{1,2}\s)/m).filter(s => s.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const headingMatch = lines[0]?.match(/^#{1,2}\s+(.+)/);
      if (!headingMatch) continue;

      const title = headingMatch[1].trim();
      const body = lines.slice(1).join('\n').trim();
      const description = body.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('```')).slice(0, 3).join(' ').trim();

      const tags: string[] = [];
      const tagMatches = body.matchAll(/`([^`]+)`/g);
      for (const m of tagMatches) {
        if (m[1].length < 30 && !m[1].includes(' ')) tags.push(m[1]);
      }

      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

      patterns.push({
        id,
        description: description || title,
        triggers: [title.toLowerCase()],
        tags: tags.slice(0, 6),
        tier: 'Project',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      });
    }
    return patterns;
  }

  function parseToml(content: string): Partial<Pattern>[] {
    const patterns: Partial<Pattern>[] = [];
    // Split by TOML table headers
    const sections = content.split(/^\[([^\]]+)\]/m);

    for (let i = 1; i < sections.length; i += 2) {
      const name = sections[i]?.trim();
      const body = sections[i + 1] || '';
      if (!name) continue;

      const descMatch = body.match(/description\s*=\s*"([^"]*)"/);
      const tagsMatch = body.match(/tags\s*=\s*\[([^\]]*)\]/);

      const tags = tagsMatch
        ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')).filter(Boolean)
        : [];

      patterns.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: descMatch?.[1] || name,
        triggers: [name.toLowerCase()],
        tags,
        tier: 'Project',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      });
    }
    return patterns;
  }

  function parseCursorRules(content: string): Partial<Pattern>[] {
    const patterns: Partial<Pattern>[] = [];
    // Cursorrules are typically a list of rules/instructions
    const sections = content.split(/\n(?=[-*]\s|#{1,3}\s|\d+\.\s)/).filter(s => s.trim());

    const rulesText = sections.length > 1 ? sections : content.split(/\n\n+/).filter(s => s.trim());

    for (const section of rulesText) {
      const text = section.replace(/^[-*#\d.]+\s*/, '').trim();
      if (text.length < 10) continue;

      const id = text.slice(0, 50).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      patterns.push({
        id,
        description: text.slice(0, 200),
        triggers: [],
        tags: ['cursorrules'],
        tier: 'Project',
        maturity: 'Draft',
        confidence: 0.5,
        examples: [],
      });
    }
    return patterns.slice(0, 20); // Cap at 20 rules
  }

  async function importPatterns() {
    importing = true;
    importedCount = 0;

    for (const p of parsedPatterns) {
      try {
        await createPattern({
          description: p.description || '',
          triggers: p.triggers || [],
          tags: p.tags || [],
          tier: p.tier || 'Project',
          maturity: p.maturity || 'Draft',
          confidence: p.confidence || 0.5,
          examples: p.examples || [],
        });
        importedCount++;
      } catch {
        // Skip failed imports
      }
    }

    importing = false;
  }

  function reset() {
    fileName = '';
    fileContent = '';
    parsedPatterns = [];
    parseError = '';
    importedCount = 0;
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-slate-100">Import Patterns</h1>
    <p class="text-sm text-slate-400 mt-1">Import patterns from YAML, Markdown, TOML, or .cursorrules files</p>
  </div>

  {#if importedCount > 0}
    <!-- Success state -->
    <div class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
      <div class="text-4xl mb-3">&#x2705;</div>
      <h2 class="text-lg font-semibold text-emerald-400">Imported {importedCount} pattern{importedCount === 1 ? '' : 's'}</h2>
      <p class="text-sm text-slate-400 mt-2">Your patterns are now available in the library.</p>
      <div class="flex justify-center gap-3 mt-6">
        <button
          onclick={reset}
          class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Import More
        </button>
        <a
          href="#/patterns"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          View Patterns
        </a>
      </div>
    </div>
  {:else}
    <!-- Drop zone -->
    <div
      role="button"
      tabindex="0"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => document.getElementById('file-input')?.click()}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input')?.click(); }}
      class="relative rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer
        {dragging ? 'border-emerald-400 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'}"
    >
      <input
        id="file-input"
        type="file"
        accept=".yaml,.yml,.md,.toml,.cursorrules"
        onchange={handleFileInput}
        class="hidden"
      />
      <svg class="mx-auto h-12 w-12 {dragging ? 'text-emerald-400' : 'text-slate-500'} mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p class="text-sm {dragging ? 'text-emerald-400' : 'text-slate-300'}">
        {dragging ? 'Drop file here' : 'Drag & drop a file here, or click to browse'}
      </p>
      <p class="text-xs text-slate-500 mt-2">
        Accepted: .yaml, .md, .toml, .cursorrules
      </p>
    </div>

    {#if parseError}
      <div class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
        {parseError}
      </div>
    {/if}

    {#if fileName && parsedPatterns.length > 0}
      <!-- Parsed results -->
      <div class="rounded-lg border border-slate-700/50 bg-slate-800 overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <div>
            <span class="text-sm font-medium text-slate-200">{fileName}</span>
            <span class="ml-2 text-xs text-slate-500">{parsedPatterns.length} pattern{parsedPatterns.length === 1 ? '' : 's'} detected</span>
          </div>
          <button onclick={reset} class="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Clear
          </button>
        </div>

        <div class="divide-y divide-slate-700/30 max-h-96 overflow-y-auto">
          {#each parsedPatterns as p, i}
            <div class="px-4 py-3">
              <div class="flex items-start justify-between gap-2 mb-1">
                <span class="text-sm font-medium text-slate-200 font-mono">{p.id || `pattern-${i + 1}`}</span>
                <div class="flex items-center gap-2 shrink-0">
                  {#if p.maturity}
                    <MaturityBadge maturity={p.maturity} size="sm" />
                  {/if}
                  {#if p.tier}
                    <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{p.tier}</span>
                  {/if}
                </div>
              </div>
              <p class="text-xs text-slate-400 line-clamp-2">{p.description}</p>
              {#if p.tags && p.tags.length > 0}
                <div class="flex flex-wrap gap-1 mt-2">
                  {#each p.tags.slice(0, 5) as tag}
                    <span class="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-700/50 px-4 py-3">
          <button
            onclick={reset}
            class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onclick={importPatterns}
            disabled={importing}
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {#if importing}
              Importing...
            {:else}
              Import {parsedPatterns.length} Pattern{parsedPatterns.length === 1 ? '' : 's'}
            {/if}
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
