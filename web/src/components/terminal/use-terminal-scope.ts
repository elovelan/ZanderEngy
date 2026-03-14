"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { buildClaudeCommand } from '@/lib/shell';
import type { TerminalScope } from "./types";

// ── Default terminal scope logic — DO NOT CHANGE ──────────────────────
// When starting Claude from the terminal panel (not task quick actions):
//   - Working dir = projectDir (so Claude has project context)
//   - Additional dirs = ALL repos via --add-dir flags
// This is DIFFERENT from task quick actions which start in the 1st repo.
// See shell.ts buildQuickActionDirs() for the quick-action logic.
export function deriveScope(
  workspaceSlug: string,
  workspaceDir: string,
  repos: string[],
  projectSlug?: string,
): TerminalScope {
  if (projectSlug) {
    return {
      scopeType: 'project',
      scopeLabel: `project: ${projectSlug}`,
      workingDir: `${workspaceDir}/projects/${projectSlug}`,
      command: buildClaudeCommand({ additionalDirs: repos }),
      groupKey: `project:${workspaceSlug}:${projectSlug}`,
    };
  }

  return {
    scopeType: 'workspace',
    scopeLabel: workspaceSlug,
    workingDir: workspaceDir,
    command: buildClaudeCommand({ additionalDirs: repos }),
    groupKey: `workspace:${workspaceSlug}`,
  };
}

export function useTerminalScope(): TerminalScope {
  const params = useParams<{ workspace?: string; project?: string }>();
  const workspaceSlug = params.workspace ?? '';
  const projectSlug = params.project;

  const { data: workspace } = trpc.workspace.get.useQuery(
    { slug: workspaceSlug },
    { enabled: !!workspaceSlug },
  );

  const workspaceDir = workspace?.resolvedDir ?? '';
  const repos = Array.isArray(workspace?.repos) ? (workspace.repos as string[]) : [];

  return deriveScope(workspaceSlug, workspaceDir, repos, projectSlug);
}
