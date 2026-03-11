---
name: engy:implement-milestone
description: "Orchestrates milestone-level implementation across task groups with agent teams. Use when asked to 'implement milestone', 'implement all tasks', 'implement m5', or when working on an entire milestone's worth of tasks."
---

# Milestone Implementation Orchestrator

Orchestrate the implementation of an entire milestone — multiple task groups, agent teams, and commit-per-group. Delegates per-task implementation to `/engy:implement`.

## MCP Tools

- `listTasks(projectId, milestoneRef, taskGroupId)` — find tasks for the milestone
- `listTaskGroups(milestoneRef)` — task groups within the milestone
- `updateTask(id, status)` — mark tasks `in_progress` / `done`
- `getProjectDetails(projectId)` — project paths (`specDir`, `projectDir`)

Use MCP to discover paths and task relationships, then Read/Glob/Grep for content.

## Workflow

### Step 1: Gather Context

1. `listTaskGroups(milestoneRef)` + `listTasks(milestoneRef)` — get the full task breakdown.
2. Look for the milestone plan doc: `Glob("{specPath}/m{N}-*.plan.md")`. Read it if found — this is the primary requirements source.
3. If no plan doc exists, read `{specPath}/spec.md` for overall context.

### Step 2: Discover Validation Gates

Scan project config to find **all explicit validation the project asks for**:

1. **CLAUDE.md** — look for explicit validation and testing instructions. These are the highest priority.

### Step 3: Plan Execution Order

1. Map task group dependencies (a group is blocked if any of its tasks have `blockedBy` pointing to tasks in another group).
2. Identify independent task groups that can run in parallel.
3. Skip task groups where all tasks are marked `done`.
4. For groups with `in_progress` tasks, check existing work via `git status` and `git diff` before re-implementing.

### Step 4: Set Up Agent Teams

**Agent teams are the default for milestone-level work.** Milestones involve multiple task groups — set up a team and parallelize independent task groups.

- Each teammate gets one task group (or a batch of related groups).
- Provide each teammate with: the plan doc (or relevant section), its task group's tasks with acceptance criteria, validation commands, and file paths.
- See `references/agent-team-coordination.md` for parallelization criteria, context requirements, and conflict prevention.

### Step 5: Create Session Tasks

Create session tasks to track the implementation workflow per *task group*, not per individual Engy task.

For each task group, create one task pair:
- **Group N#a** (implement) — all tasks in the group, their requirements and test scenarios, tests-only command
- **Group N#b** (validate/fix/commit) — full validation command, skill invocations

Chain dependencies: N#a → N#b → (N+1)#a (for dependent groups only — independent groups run in parallel).

Add a **Final Validation** task after all pairs.

### Step 6: Execute Per Task Group

For each task group:

1. Mark each task `in_progress` via `updateTask(id, status: "in_progress")` when starting it.
2. Follow the `/engy:implement` per-task TDD flow (Entry Point A) for each task in the group.
3. Run `/engy:review` on the group's changes.
4. Run the **full validation command**, read complete output, verify explicitly.
5. **Circuit breaker:** after 3 failed validation/review cycles, stop and report to user with diagnostics.
6. On success: **commit the task group** as one deliverable. Mark all tasks in the group as `done` via `updateTask(id, status: "done")`.

**Do not batch multiple task groups into one commit.** Each group is a single deliverable (one PR worth of work).

### Step 7: Final Validation

After all task groups complete, run end-to-end validation appropriate for the project.

## Key Principles

- **Task-group-level commits.** One commit per task group, each in a working state.
- **Agent teams by default.** Milestone work should parallelize independent task groups.
- **Delegate, don't duplicate.** Per-task implementation uses `/engy:implement` — this skill orchestrates.
- **Evidence before claims.** Run build, read full output, verify explicitly.
- **Fresh context per agent.** Each teammate gets a complete, self-contained task group description. Never assume shared context.

## Additional Resources

### Reference Files

- **`references/agent-team-coordination.md`** - Parallelization criteria, agent context requirements, and conflict prevention guidelines

## Flow Position

**Previous:** `validate-plan` | **Next:** `review`

When all task groups are complete and passing, proceed with `/engy:review` for a final code review of all changes.
