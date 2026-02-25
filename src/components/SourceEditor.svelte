<script lang="ts">
  import { onMount } from 'svelte';
  import type { Pattern } from '../lib/types';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { yaml } from '@codemirror/lang-yaml';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';

  interface Props {
    pattern: Pattern;
    onchange: (pattern: Pattern) => void;
  }

  let { pattern, onchange }: Props = $props();

  let editorEl: HTMLDivElement;
  let editorView: EditorView | undefined;
  let format = $state<'yaml' | 'markdown'>('yaml');

  function patternToYaml(p: Pattern): string {
    const lines: string[] = [];
    lines.push(`id: ${p.id}`);
    lines.push(`description: |`);
    lines.push(`  ${p.description}`);
    lines.push(`tier: ${p.tier}`);
    lines.push(`maturity: ${p.maturity}`);
    lines.push(`confidence: ${p.confidence}`);
    lines.push(`triggers:`);
    for (const t of p.triggers) lines.push(`  - "${t}"`);
    lines.push(`tags:`);
    for (const t of p.tags) lines.push(`  - ${t}`);
    if (p.examples.length > 0) {
      lines.push(`examples:`);
      for (const ex of p.examples) {
        lines.push(`  - language: ${ex.language}`);
        if (ex.description) lines.push(`    description: "${ex.description}"`);
        lines.push(`    code: |`);
        for (const line of ex.code.split('\n')) {
          lines.push(`      ${line}`);
        }
      }
    }
    if (p.related && p.related.length > 0) {
      lines.push(`related:`);
      for (const r of p.related) lines.push(`  - ${r}`);
    }
    return lines.join('\n');
  }

  function patternToMarkdown(p: Pattern): string {
    const lines: string[] = [];
    lines.push(`# ${p.id}`);
    lines.push('');
    lines.push(p.description);
    lines.push('');
    lines.push(`**Tier:** ${p.tier}  `);
    lines.push(`**Maturity:** ${p.maturity}  `);
    lines.push(`**Confidence:** ${p.confidence}  `);
    lines.push('');
    lines.push('## Triggers');
    for (const t of p.triggers) lines.push(`- ${t}`);
    lines.push('');
    lines.push('## Tags');
    lines.push(p.tags.map(t => `\`${t}\``).join(', '));
    lines.push('');
    if (p.examples.length > 0) {
      lines.push('## Examples');
      for (const ex of p.examples) {
        if (ex.description) lines.push(`\n### ${ex.description}`);
        lines.push(`\n\`\`\`${ex.language}`);
        lines.push(ex.code);
        lines.push('```');
      }
    }
    return lines.join('\n');
  }

  function getContent(): string {
    return format === 'yaml' ? patternToYaml(pattern) : patternToMarkdown(pattern);
  }

  function createEditor() {
    if (editorView) editorView.destroy();

    const langExt = format === 'yaml' ? yaml() : markdown();

    editorView = new EditorView({
      state: EditorState.create({
        doc: getContent(),
        extensions: [
          basicSetup,
          langExt,
          oneDark,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' },
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: editorEl,
    });
  }

  onMount(() => {
    createEditor();
    return () => editorView?.destroy();
  });

  $effect(() => {
    // Re-create editor when format changes
    if (editorEl && format) {
      createEditor();
    }
  });
</script>

<div class="flex flex-col h-full">
  <div class="flex items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2">
    <span class="text-xs text-slate-500 mr-2">Format:</span>
    <div class="flex rounded-md border border-slate-700 bg-slate-800 p-0.5">
      <button
        onclick={() => format = 'yaml'}
        class="rounded px-3 py-1 text-xs transition-colors {format === 'yaml' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}"
      >
        YAML
      </button>
      <button
        onclick={() => format = 'markdown'}
        class="rounded px-3 py-1 text-xs transition-colors {format === 'markdown' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}"
      >
        Markdown
      </button>
    </div>
    <span class="ml-auto text-[10px] text-slate-600">Read-only source view</span>
  </div>
  <div bind:this={editorEl} class="flex-1 overflow-hidden"></div>
</div>
