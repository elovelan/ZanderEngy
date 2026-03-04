"use client";

import { trpc } from "@/lib/trpc";
import { ProjectCard } from "./project-card";

export function WorkspaceOverview({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: number;
  workspaceSlug: string;
}) {
  const { data: projects } = trpc.project.listWithProgress.useQuery({ workspaceId });

  if (!projects) return null;

  const defaultProject = projects.find((p) => p.isDefault);
  const otherProjects = projects.filter((p) => !p.isDefault);

  return (
    <div className="flex flex-col gap-4">
      {defaultProject && (
        <ProjectCard project={defaultProject} workspaceSlug={workspaceSlug} />
      )}
      {otherProjects.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold">Projects</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {otherProjects.map((p) => (
              <ProjectCard key={p.id} project={p} workspaceSlug={workspaceSlug} />
            ))}
          </div>
        </div>
      )}
      {projects.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground">No projects yet</p>
      )}
    </div>
  );
}
