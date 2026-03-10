"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { buildAddDirFlags } from "@/lib/shell";
import type { TerminalScope } from "./types";

function deriveScope(
  workspaceSlug: string,
  workspaceDir: string,
  repos: string[],
  projectSlug?: string,
): TerminalScope {
  const addDirFlags = buildAddDirFlags(repos);

  if (projectSlug) {
    return {
      scopeType: 'project',
      scopeLabel: `project: ${projectSlug}`,
      workingDir: `${workspaceDir}/projects/${projectSlug}`,
      command: `claude${addDirFlags}`,
    };
  }

  return {
    scopeType: 'workspace',
    scopeLabel: workspaceSlug,
    workingDir: workspaceDir,
    command: `claude${addDirFlags}`,
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
