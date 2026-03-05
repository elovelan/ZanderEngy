# SDD Workflow Reference

The full spec-driven development loop, end to end.

```text
SYSTEM DOC (current state) + WORKSPACE MEMORY (files)
  ↓
  │  Terminal: spec-writing skill reads context
  ↓
SPEC DRAFTING (proposed change — files)
  ↓
  ├── spec tasks created (research + preparation)
  ├── AI tasks: agent sessions research, produce context/ files
  ├── human tasks: manual research, conversations, decisions
  ├── user reviews context files, sends feedback → routes to agent sessions
  ├── spec text refined as research completes
  ↓
SPEC READY → REVIEWED → APPROVED
  ↓
  │  Terminal: user approves, triggers project creation
  ↓
PROJECT (created in SQLite from spec)
  ↓
  │  Terminal: planning skill decomposes into milestones (rough scope)
  │  User reviews/adjusts in terminal + project view
  ↓
MILESTONE PLANNING (progressive, per milestone when ready)
  ↓
  │  Terminal: planning skill decomposes milestone into groups → tasks
  │  Optionally: task-level plan loop produces an approved implementation plan that guides agent execution
  ↓
EXECUTE (user starts task groups manually, or auto-start when dependencies resolve)
  ↓
  ├── agent sessions activate per task group
  ├── tasks execute sequentially within sessions
  ├── diffs flow to diff viewer as work progresses
  ├── user reviews diffs, comments route to agent sessions
  ├── agents revise, user approves
  ├── pre-commit gate runs (per-repo configured command, e.g. yarn blt)
  ├── agent auto-commits, pushes, creates PR via gh
  ├── CI failures → agent auto-fixes (mechanical), pushes
  ├── reviewer comments → user triages, selects which to fix, dispatches agent
  ├── PR merged
  ├── fleeting memories accumulate in SQLite
  ↓
COMPLETE (automatic when all milestones done, or manually triggered at any time)
  ├── remaining work explicitly dropped if manually completed
  ├── memory distillation runs → valuable memories written to .engy/memory/
  ├── system doc update proposed → appears in diff viewer for review
  ├── user reviews and approves system doc diffs
  ├── spec status updated to Completed
  ├── worktrees cleaned up, agent sessions discarded
  └── project archived (compacted, read-only) ← outcomes extracted, structure preserved
```

## Parallelization

Task groups on independent repos can run in parallel — separate worktrees, separate agent sessions, no conflicts. The dependency graph is partially repo-aware:

```text
[engy-api] Group: "Add endpoints" ──┐
                                      ├── [engy-api, engy-app] Group: "Wire e2e"
[engy-app] Group: "Add auth hooks" ──┘
```

Milestones can also parallelize when independent (no cross-milestone task dependencies).

## Worktree Strategy

Worktrees are tied to **task groups** — the shippable unit of work (a set of tasks that become one PR).

```text
Pick up Task Group A (T150, T151, T152) in Milestone 1
  → group knows it touches engy-api
  → create worktree: engy-api/worktrees/auth-revamp-token-refresh
  → create branch: auth-revamp/token-refresh
  → agent session executes tasks sequentially in the worktree
  → each task produces diffs (visible in diff viewer)
  → user reviews diffs, provides feedback → routes to agent session
  → agent revises → user approves
  → pre-commit gate runs → agent auto-commits, pushes, creates PR via gh
  → external PR comments pulled back → agent addresses
  → PR merged → worktree cleaned up
```

**Multi-repo task groups:**

```text
Task Group: "Wire refresh flow e2e"
  repos: [engy-api, engy-app]
  → worktree in each repo
  → agent session works across both
  → diffs from both repos appear together in diff viewer
  → user approves → agent auto-commits in each repo independently
  → agent pushes, creates separate PR for each repo
  → PRs progress independently (one can merge while agent fixes the other)
  → group advances to Merged only when ALL repos' PRs have merged
  → all worktrees cleaned up
```

The workspace defines which repos are available by default. The task group declares which repos it touches — including repos outside the workspace when needed. Worktrees are lazy: spun up when a group becomes Active, torn down when it reaches Cleaned Up.

### Branch Naming

Derived from project slug + group name:

```text
auth-revamp/token-refresh
auth-revamp/frontend-auth-hook
ci-overhaul/pipeline-migration
```
