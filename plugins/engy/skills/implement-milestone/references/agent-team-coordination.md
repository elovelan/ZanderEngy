# Agent Team Coordination

## Dispatch Model

One agent per task. The orchestrator spawns agents — it never implements.

## When to Parallelize

Within a task group, parallelize tasks that have **no mutual `blockedBy` dependencies**. Spawn parallel tasks as concurrent team members in a single message (multiple Agent tool calls).

Serialize when:
- Task B has `blockedBy` pointing to Task A in the same group.
- Tasks modify overlapping file sets (check before dispatching).
- Tasks share mutable state (e.g., DB migrations that must run in order).

When in doubt, serialize — merge conflicts cost more than time saved.

## Context Per Agent

**Required:** task title + description, relevant plan section, validation commands to run, instruction to commit before returning.

**Recommended:** 1-2 existing files as pattern references, boundary files (read-only), explicit list of files NOT to touch.

**Avoid:** sending the entire plan, assuming shared context, vague "follow patterns" without file refs.

## Validation Contract

Every agent (implementation and fix) must:
1. Run the validation commands provided by the orchestrator.
2. Fix any issues found.
3. Commit changes before returning.
4. Report: what was done, what was committed, any unresolved issues.

## Conflict Prevention

- Verify file sets don't overlap before dispatching parallel agents. If they do: merge into one agent or serialize.
- Shared type files: one agent owns it, others read-only — OR extract as prerequisite task.
- If a parallel agent returns with merge conflicts, serialize remaining tasks in the group and resolve conflicts before continuing.
