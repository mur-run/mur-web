# 🧠 MUR Web Dashboard

Web UI for [MUR](https://github.com/mur-run/mur) — a continuous learning system for AI assistants.

**Live demo:** [mur-run.github.io/mur-web](https://mur-run.github.io/mur-web/)

## Features

- **Dashboard** — stats, confidence distribution chart, activity timeline, decay warnings
- **Patterns** — browse, filter, search, bulk archive/delete, maturity badges
- **Pattern Graph** — force-directed visualization of pattern relationships
- **Workflows** — create, edit, reorder steps, delete
- **Import** — paste YAML patterns and import into your library
- **Settings** — data source switching (Demo/Local/Cloud), connection test, export/import JSON
- **⌘K Search** — spotlight-style command palette
- **Real-time** — WebSocket connection to `mur serve` for live updates
- **Mobile** — responsive sidebar with hamburger menu

## Architecture

```
src/
├── lib/
│   ├── api.ts          # HTTP client (Demo/Local/Cloud backends)
│   ├── dataStore.ts    # Shared reactive data cache
│   ├── realtime.ts     # WebSocket client (auto-reconnect)
│   ├── router.ts       # Hash-based SPA router
│   ├── toast.ts        # Toast notification system
│   ├── types.ts        # TypeScript types
│   └── mock-data.ts    # Demo mode sample data
├── components/
│   ├── CommandPalette.svelte   # ⌘K spotlight search
│   ├── Toast.svelte            # Toast notifications
│   ├── ConfidenceChart.svelte  # Canvas histogram
│   ├── ActivityTimeline.svelte # Canvas 30-day chart
│   ├── MaturityBadge.svelte    # Maturity pill badge
│   ├── ConfidenceSlider.svelte # Confidence bar
│   └── ...
├── routes/
│   ├── Dashboard.svelte
│   ├── Patterns.svelte
│   ├── PatternEditor.svelte
│   ├── Graph.svelte
│   ├── Workflows.svelte
│   ├── Settings.svelte
│   ├── Import.svelte
│   ├── Search.svelte
│   └── NewPattern.svelte
└── App.svelte          # Root layout + routing
```

**Stack:** Svelte 5 (runes) · TypeScript · Tailwind CSS · Vite · Canvas API

## Quick Start

```bash
# Development
npm install
npm run dev        # → http://localhost:5173

# Production build
npm run build      # → dist/

# Preview build
npm run preview
```

## Data Sources

| Mode | Backend | URL |
|------|---------|-----|
| **Demo** | Mock data (no server needed) | — |
| **Local** | `mur serve` on localhost | `http://localhost:3847` |
| **Cloud** | mur-server on Fly.io | `https://mur-server.fly.dev` |

Auto-detects local backend on load. Switch manually in Settings.

## Embedded in MUR

The dashboard is embedded directly into the `mur` binary via `rust-embed`. When you run `mur serve`, the web UI is available at `http://localhost:3847` alongside the API.

```bash
# Install mur
brew tap mur-run/tap && brew install mur

# Start server with embedded dashboard
mur serve --open
```

## API

All endpoints under `/api/v1/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/patterns` | List/Create patterns |
| GET/PUT/DELETE | `/patterns/{id}` | CRUD pattern |
| GET/POST | `/workflows` | List/Create workflows |
| GET/PUT/DELETE | `/workflows/{id}` | CRUD workflow |
| GET | `/stats` | Dashboard statistics |
| GET | `/tags` | All tags |
| GET | `/links/{id}` | Pattern relationships |
| POST | `/search` | Search patterns |
| WS | `/ws` | Real-time events |

## License

MIT
