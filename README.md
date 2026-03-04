# Engy

**AI-assisted engineering workspace for spec-driven development.**

---

> **⚠️ Work in progress — active development, fully vibecoded.**
> Expect rough edges, missing features, and things that break. This is being built in the open as a personal tool. Use at your own risk.

---

## What is Engy

Engy is a single-user workspace manager for spec-driven development. It gives you a permanent home for ongoing concerns (a codebase, a product, accumulated knowledge) and ephemeral execution scopes for bounded work (features, refactors, bug fixes).

The core loop: **Specify → Plan → Execute → Complete.** You write specs in Engy's editor, plan projects from approved specs, run AI agents against tasks, review diffs, and extract learnings back into your knowledge base — all without leaving the app.

Everything is accessible to AI agents via a built-in MCP server, so Claude Code CLI running in your terminal can read and write Engy data directly.

## Getting Started

**Prerequisites:** Node.js 20+, pnpm 10+

```bash
pnpm install

# Set up environment
cp .env.example .dev.env
# Edit .dev.env if needed (defaults work for local dev)

# Start both the web server and client daemon
pnpm dstartv
```

Open [http://localhost:3000](http://localhost:3000).

The `web/` server runs on port 3000. The `client/` daemon connects to it over WebSocket — it's what handles local filesystem access and git operations on your machine.

**Environment variables** (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Web server port |
| `ENGY_DIR` | `~/.engy/` | Data directory (SQLite DB + workspace dirs). Dev default: `.dev-engy/` |
| `ENGY_SERVER_URL` | `http://localhost:3000` | Server URL for the client daemon |

## Architecture

pnpm monorepo with three packages:

```
web/      Next.js 16 + custom Node.js HTTP server
          ├── Frontend (App Router, React 19)
          ├── tRPC API (browser UI)
          ├── MCP server (AI agent access via Claude Code CLI)
          └── WebSocket server (private channel to client daemon)

client/   Node.js daemon — runs on your machine
          ├── Filesystem access (path validation, file watching)
          └── Git operations (branch info, status, worktrees)

common/   Shared TypeScript types only (WebSocket protocol)
```

**One port, three protocols.** The web server handles Next.js HTTP, WebSocket (`/ws`), and MCP SSE (`/mcp`) on a single port.

**Server never touches your repos directly.** It sends requests to the client daemon, which validates paths and responds. This lets the server run remotely while repos stay local.

**Data split.** SQLite holds execution state (workspaces, projects, tasks, memories). Your `.engy/` directory holds knowledge as git-trackable markdown files (specs, system docs, shared docs, memory).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| API | tRPC v11 + superjson |
| AI access | MCP SDK 1.27 (SSE transport) |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Editor | BlockNote 0.47 |
| UI | shadcn/ui, Tailwind CSS v4, JetBrains Mono |
| Testing | Vitest (90%+ coverage on server code) |
| Monorepo | Turborepo + pnpm workspaces |

## Development

```bash
pnpm dev          # Start web + client (loads .dev.env)
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm blt          # Pre-commit gate: build + lint + test + dead code checks
```

`pnpm blt` must pass before committing. It runs TypeScript compilation, ESLint, Vitest with coverage thresholds (90% statements on server code), knip (dead code), and jscpd (copy-paste detection).

Tests follow a BDD style (`describe > describe > it('should ...')`) with a Testing Trophy approach — integration tests covering full vertical slices are preferred over unit tests. Tests use real SQLite instances, no mocks for the database.

## Roadmap

See [`docs/projects/initial/milestones.md`](docs/projects/initial/milestones.md) for the full milestone plan (M1–M12).

Current state:
- **M1 Foundation** — done
- **M2 Spec Authoring** — done
- **M3 Open Directory** — in progress
- **M4–M12** — planned (project planning, terminal integration, diff viewer, execution engine, knowledge layer, async agents, dev containers, PR/CI monitoring)
