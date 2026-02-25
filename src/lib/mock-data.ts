import type { Pattern, Workflow } from './types';

export const mockPatterns: Pattern[] = [
  {
    id: 'error-handling-typescript',
    description: 'Use discriminated unions for error handling in TypeScript instead of try/catch for expected failures. Define Result<T, E> types for predictable error flows.',
    triggers: ['error handling', 'typescript', 'result type', 'discriminated union'],
    tags: ['typescript', 'error-handling', 'patterns', 'best-practices'],
    tier: 'Global',
    maturity: 'Stable',
    confidence: 0.92,
    examples: [
      {
        language: 'typescript',
        code: `type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function parseJSON(input: string): Result<unknown, string> {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
}`,
        description: 'Basic Result type pattern',
      },
    ],
    related: ['async-error-patterns', 'validation-pipeline'],
    stats: { injections: 47, last_used: '2025-12-15T10:30:00Z', created: '2025-06-01T00:00:00Z', updated: '2025-12-15T10:30:00Z' },
  },
  {
    id: 'svelte-5-runes',
    description: 'Svelte 5 replaces stores with runes ($state, $derived, $effect). Use $state for reactive variables, $derived for computed values, $effect for side effects.',
    triggers: ['svelte', 'runes', '$state', '$derived', '$effect', 'reactivity'],
    tags: ['svelte', 'frontend', 'reactivity', 'migration'],
    tier: 'Project',
    maturity: 'Canonical',
    confidence: 0.98,
    examples: [
      {
        language: 'svelte',
        code: `<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('Count changed:', count);
  });
</script>`,
        description: 'Basic runes usage in Svelte 5',
      },
    ],
    stats: { injections: 83, last_used: '2025-12-20T14:00:00Z', created: '2025-03-15T00:00:00Z', updated: '2025-12-20T14:00:00Z' },
  },
  {
    id: 'api-rate-limiting',
    description: 'Implement token bucket rate limiting for API endpoints. Use sliding window counters for distributed systems.',
    triggers: ['rate limit', 'api', 'throttle', 'token bucket'],
    tags: ['api', 'security', 'performance', 'backend'],
    tier: 'Global',
    maturity: 'Stable',
    confidence: 0.85,
    examples: [
      {
        language: 'typescript',
        code: `class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillRate: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(): boolean {
    this.refill();
    if (this.tokens > 0) { this.tokens--; return true; }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}`,
        description: 'Token bucket implementation',
      },
    ],
    stats: { injections: 23, last_used: '2025-11-30T09:00:00Z', created: '2025-07-10T00:00:00Z', updated: '2025-11-30T09:00:00Z' },
  },
  {
    id: 'css-container-queries',
    description: 'Use CSS container queries for component-level responsive design instead of relying solely on viewport media queries.',
    triggers: ['container queries', 'responsive', 'css', 'component design'],
    tags: ['css', 'responsive', 'frontend', 'modern-css'],
    tier: 'Project',
    maturity: 'Emerging',
    confidence: 0.73,
    examples: [
      {
        language: 'css',
        code: `.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}

@container card (max-width: 399px) {
  .card { display: flex; flex-direction: column; }
}`,
        description: 'Container query for responsive card layout',
      },
    ],
    stats: { injections: 12, last_used: '2025-12-10T16:00:00Z', created: '2025-09-01T00:00:00Z', updated: '2025-12-10T16:00:00Z' },
  },
  {
    id: 'git-worktree-workflow',
    description: 'Use git worktrees for parallel development instead of stashing or switching branches. Each worktree gets its own working directory.',
    triggers: ['git worktree', 'parallel development', 'branch management'],
    tags: ['git', 'workflow', 'productivity', 'devtools'],
    tier: 'Global',
    maturity: 'Stable',
    confidence: 0.88,
    examples: [
      {
        language: 'bash',
        code: `# Create a worktree for a feature branch
git worktree add ../feature-auth feature/auth

# List all worktrees
git worktree list

# Remove when done
git worktree remove ../feature-auth`,
        description: 'Basic git worktree commands',
      },
    ],
    stats: { injections: 31, last_used: '2025-12-18T11:00:00Z', created: '2025-04-20T00:00:00Z', updated: '2025-12-18T11:00:00Z' },
  },
  {
    id: 'zod-validation',
    description: 'Use Zod for runtime schema validation at system boundaries. Combine with TypeScript for end-to-end type safety from API responses to UI.',
    triggers: ['zod', 'validation', 'schema', 'runtime types', 'type safety'],
    tags: ['typescript', 'validation', 'api', 'type-safety'],
    tier: 'Global',
    maturity: 'Canonical',
    confidence: 0.95,
    examples: [
      {
        language: 'typescript',
        code: `import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'user', 'viewer']),
});

type User = z.infer<typeof UserSchema>;

// Validate API response
const user = UserSchema.parse(await res.json());`,
        description: 'Zod schema with type inference',
      },
    ],
    stats: { injections: 56, last_used: '2025-12-19T08:00:00Z', created: '2025-05-15T00:00:00Z', updated: '2025-12-19T08:00:00Z' },
  },
  {
    id: 'testing-snapshot-pitfall',
    description: 'Avoid excessive snapshot testing — it creates brittle tests that break on any UI change. Prefer testing behavior and accessibility over HTML structure.',
    triggers: ['snapshot testing', 'test strategy', 'brittle tests'],
    tags: ['testing', 'pitfall', 'frontend', 'best-practices'],
    tier: 'Global',
    maturity: 'Emerging',
    confidence: 0.68,
    examples: [
      {
        language: 'typescript',
        code: `// BAD: Snapshot test
expect(container).toMatchSnapshot();

// GOOD: Behavior test
const button = screen.getByRole('button', { name: /submit/i });
await userEvent.click(button);
expect(screen.getByText('Success')).toBeInTheDocument();`,
        description: 'Behavior tests over snapshot tests',
      },
    ],
    stats: { injections: 8, last_used: '2025-10-05T12:00:00Z', created: '2025-08-20T00:00:00Z', updated: '2025-10-05T12:00:00Z' },
  },
  {
    id: 'database-indexing-checklist',
    description: 'Checklist for database index optimization: cover query patterns, avoid over-indexing, use composite indexes wisely, monitor slow queries.',
    triggers: ['database index', 'query optimization', 'slow query', 'postgres index'],
    tags: ['database', 'performance', 'checklist', 'postgres'],
    tier: 'Global',
    maturity: 'Stable',
    confidence: 0.82,
    examples: [
      {
        language: 'sql',
        code: `-- Check for missing indexes on frequently queried columns
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY n_distinct DESC;

-- Create a composite index for common query pattern
CREATE INDEX CONCURRENTLY idx_orders_user_status
ON orders (user_id, status)
WHERE status != 'archived';`,
        description: 'PostgreSQL index analysis and creation',
      },
    ],
    stats: { injections: 19, last_used: '2025-12-01T15:00:00Z', created: '2025-06-15T00:00:00Z', updated: '2025-12-01T15:00:00Z' },
  },
  {
    id: 'async-iteration-pattern',
    description: 'Use async generators and for-await-of for streaming data processing. Handles backpressure naturally and composes well with pipelines.',
    triggers: ['async generator', 'streaming', 'for await', 'data pipeline'],
    tags: ['javascript', 'async', 'patterns', 'streaming'],
    tier: 'Project',
    maturity: 'Draft',
    confidence: 0.45,
    examples: [
      {
        language: 'typescript',
        code: `async function* fetchPages<T>(url: string): AsyncGenerator<T[]> {
  let page = 1;
  while (true) {
    const res = await fetch(\`\${url}?page=\${page}\`);
    const data: T[] = await res.json();
    if (data.length === 0) break;
    yield data;
    page++;
  }
}

for await (const users of fetchPages<User>('/api/users')) {
  await processUsers(users);
}`,
        description: 'Paginated API fetching with async generators',
      },
    ],
    stats: { injections: 3, last_used: '2025-09-20T10:00:00Z', created: '2025-09-15T00:00:00Z', updated: '2025-09-20T10:00:00Z' },
  },
  {
    id: 'tailwind-dark-mode',
    description: 'Configure Tailwind dark mode with class strategy for user-controlled theme switching. Use CSS custom properties for complex theme tokens.',
    triggers: ['dark mode', 'tailwind', 'theme', 'color scheme'],
    tags: ['tailwind', 'css', 'theming', 'frontend'],
    tier: 'Project',
    maturity: 'Stable',
    confidence: 0.79,
    archived: true,
    examples: [
      {
        language: 'html',
        code: `<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
  <h1 class="text-2xl font-bold">Theme-aware heading</h1>
  <p class="text-slate-600 dark:text-slate-400">Adapts to dark mode</p>
</div>`,
        description: 'Dark mode classes in Tailwind',
      },
    ],
    stats: { injections: 15, last_used: '2025-08-01T09:00:00Z', created: '2025-03-01T00:00:00Z', updated: '2025-08-01T09:00:00Z' },
  },
];

export const mockWorkflows: Workflow[] = [
  {
    id: 'code-review-flow',
    name: 'Code Review Workflow',
    description: 'Standard code review process with automated checks and human review stages.',
    steps: ['Run linters', 'Run tests', 'Check coverage', 'Peer review', 'Merge'],
    created: '2025-05-01T00:00:00Z',
    updated: '2025-12-10T00:00:00Z',
  },
  {
    id: 'bug-triage-flow',
    name: 'Bug Triage Workflow',
    description: 'Process for triaging and prioritizing bug reports from users and automated monitoring.',
    steps: ['Reproduce', 'Categorize severity', 'Assign owner', 'Create spec', 'Fix and verify'],
    created: '2025-06-15T00:00:00Z',
    updated: '2025-11-20T00:00:00Z',
  },
  {
    id: 'deploy-pipeline',
    name: 'Deployment Pipeline',
    description: 'CI/CD pipeline stages from commit to production deployment.',
    steps: ['Build', 'Unit tests', 'Integration tests', 'Stage deploy', 'Smoke tests', 'Prod deploy'],
    created: '2025-04-01T00:00:00Z',
    updated: '2025-12-15T00:00:00Z',
  },
];
