# Dev Containers for Async Execution

## Problem

When agents execute code autonomously (M6+), they need filesystem and shell permissions that users must currently approve manually. This breaks async workflows — you can't walk away if the agent keeps asking for permission. Running agents in dev containers provides a sandboxed environment where all permissions are enabled by default, since the container's network firewall prevents data exfiltration.

## Design

### Architecture

Dev containers are an **optional, per-workspace feature** that users enable in workspace settings. The system works without containers (default mode) — the client daemon handles everything directly and agents use Claude Code's normal permission model.

When enabled, the client daemon manages container lifecycle on the user's machine.

```text
┌──────────────────────┐
│   Engy Server        │  (local or remote)
│   (Next.js + WS)     │
│                      │
│   ◄── WebSocket ──►  │
│                      │
└──────┬───────────────┘
       │
       │  WebSocket (safe ops: path validation, git info)
       │
┌──────▼───────────────┐
│   Client Daemon      │  (user's machine)
│   - Container mgmt   │
│   - Path validation   │
│   - Basic git ops     │
│   - File watching     │
└──────┬───────────────┘
       │
       │  Docker API (manages containers)
       │
┌──────▼───────────────┐
│   Workspace Container │  (per workspace, on-demand)
│   - Claude Code CLI   │
│   - Agent runtime     │
│   - Full permissions  │
│   - Network firewall  │
│   - Bind-mounted repos│
│   ◄── WebSocket ──►  │  (connects directly to server)
└──────────────────────┘
```

### Client Daemon (hybrid role)

The daemon stays on the user's machine and handles two categories of work:

**Direct (safe operations):**
- Path validation (`VALIDATE_PATHS_REQUEST` / `VALIDATE_PATHS_RESPONSE`)
- Basic git info (`getBranchInfo`, `getStatus`)
- File watching (chokidar, `FILE_CHANGE` events)
- Workspace bootstrap operations

**Delegated to containers (dangerous operations):**
- Code execution (agent sessions, task group work)
- Shell commands with full filesystem access
- Any operation that would normally require user permission approval

The daemon is the bridge between local filesystem reality and containerized execution. It knows local repo paths and translates them into container bind mounts.

### Container Lifecycle

**On-demand:** Containers start when a task group activates or an agent session begins. They stop after a configurable idle timeout (no active agent sessions). This saves resources compared to always-running containers.

**Per workspace:** One container per workspace. All agent sessions for that workspace run inside the same container. The container has access to all repos configured for the workspace.

**Startup flow:**
1. Task group activates or agent session starts
2. Daemon checks if workspace container is running
3. If not, daemon builds/starts container from Engy base image + workspace overrides
4. Container connects to Engy server via WebSocket
5. Agent session begins inside container

**Shutdown flow:**
1. Last agent session in container completes
2. Idle timer starts (configurable, e.g. 10 minutes)
3. If no new sessions start, daemon stops the container
4. Worktree state persists on host via bind mounts

### Container Configuration

**Engy provides sensible defaults + users override via workspace settings.**

The base Engy container image includes:
- Node.js runtime
- Claude Code CLI
- Common dev tools (git, gh, build essentials)
- Firewall initialization script

Users customize per workspace:
- **Allowed network domains** (base: Anthropic API, GitHub, npm registry + user additions)
- **Extra packages** (e.g., Python, Rust, Go toolchains)
- **Environment variables**
- **Idle timeout duration**

### Repo Access (hybrid: bind mount + worktrees)

Repos are bind-mounted from the host into the container. Agents always work in git worktrees (already planned in M6), so the main branch stays untouched — agents only modify worktree copies.

```text
Host filesystem              Container filesystem
~/repos/my-app/         →    /workspace/my-app/          (bind mount, read-only main)
~/repos/my-app/.worktrees/ → /workspace/my-app/.worktrees/ (bind mount, read-write)
```

### Network Firewall

Adapted from Claude Code's devcontainer approach. Uses iptables with ipset allowlists inside the container.

**Base allowlist (always included):**
- `api.anthropic.com` (Claude API)
- `api.github.com` + GitHub IP ranges (git push/pull, PR creation)
- `registry.npmjs.org` (package installation)

**Workspace-defined additions:**
- Custom registries (e.g., private npm, PyPI)
- External APIs the project needs
- CI/CD endpoints

The firewall runs as `postStartCommand` with `NET_ADMIN` / `NET_RAW` capabilities (same as Claude Code's devcontainer). All other outbound traffic is blocked, preventing data exfiltration.

### Permission Model

| Mode | Filesystem | Network | User approval |
|------|-----------|---------|---------------|
| Default (no container) | Normal Claude Code permissions | Unrestricted | Per-action approval required |
| Containerized | Full access inside container | Firewall allowlist only | No approval needed |

The container provides the safety guarantee: agents can't exfiltrate data because the network is locked down, so granting full filesystem permissions is safe.

## Milestone Placement

Ships as part of **M6 (Execution Engine)** alongside worktree management. The container wraps the existing worktree model — worktrees provide branch isolation, containers provide permission isolation.

## Workspace Settings Schema (additions)

```yaml
# workspace.yaml additions
container:
  enabled: false                    # opt-in
  allowedDomains:                   # extra domains beyond base allowlist
    - "registry.company.com"
    - "api.internal.service.com"
  extraPackages:                    # additional system packages
    - "python3"
    - "rustc"
  env:                              # extra environment variables
    CUSTOM_VAR: "value"
  idleTimeoutMinutes: 10            # stop container after idle period
```

## Reference

Based on [Claude Code's devcontainer configuration](https://github.com/anthropics/claude-code/tree/main/.devcontainer), which uses the same pattern: Docker container with iptables firewall allowlisting specific domains, enabling full-permission Claude Code execution inside the sandbox.
