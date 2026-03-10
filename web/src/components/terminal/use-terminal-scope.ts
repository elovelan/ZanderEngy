"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import type { TerminalScope } from "./types";

function deriveScope(
  workspaceSlug: string,
  workspaceDir: string,
  projectSlug?: string,
): TerminalScope {
  if (projectSlug) {
    return {
      scopeType: 'project',
      scopeLabel: `project: ${projectSlug}`,
      workingDir: `${workspaceDir}/projects/${projectSlug}`,
      command: 'claude',
    };
  }

  return {
    scopeType: 'workspace',
    scopeLabel: workspaceSlug,
    workingDir: workspaceDir,
    command: 'claude',
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

  return deriveScope(workspaceSlug, workspaceDir, projectSlug);
}
