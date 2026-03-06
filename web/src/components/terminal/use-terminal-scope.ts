"use client";

import { usePathname, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import type { TerminalScope } from "./types";

function deriveScope(
  pathname: string,
  workspaceSlug: string,
  workspaceDir: string,
  projectSlug?: string,
): TerminalScope {
  const base = `/w/${workspaceSlug}`;

  if (projectSlug && pathname.startsWith(`${base}/projects/${projectSlug}`)) {
    return {
      scopeType: 'project',
      scopeLabel: `project: ${projectSlug}`,
      workingDir: `${workspaceDir}/projects/${projectSlug}`,
      command: 'claude',
    };
  }

  if (pathname.startsWith(`${base}/tasks`)) {
    return {
      scopeType: 'workspace',
      scopeLabel: `tasks: ${workspaceSlug}`,
      workingDir: workspaceDir,
      command: 'claude',
    };
  }

  if (pathname.startsWith(`${base}/docs`)) {
    return {
      scopeType: 'docs',
      scopeLabel: `docs: ${workspaceSlug}`,
      workingDir: workspaceDir,
      command: 'claude',
    };
  }

  return {
    scopeType: 'workspace',
    scopeLabel: workspaceSlug,
    workingDir: workspaceDir,
  };
}

export function useTerminalScope(): TerminalScope {
  const pathname = usePathname();
  const params = useParams<{ workspace?: string; project?: string }>();
  const workspaceSlug = params.workspace ?? '';
  const projectSlug = params.project;

  const { data: workspace } = trpc.workspace.get.useQuery(
    { slug: workspaceSlug },
    { enabled: !!workspaceSlug },
  );

  const workspaceDir = workspace?.resolvedDir ?? '';

  return deriveScope(pathname, workspaceSlug, workspaceDir, projectSlug);
}
