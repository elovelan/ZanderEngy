"use client";

import { trpc } from "@/lib/trpc";
import { FileTree } from "@/components/file-tree";

interface ProjectTreeProps {
  workspaceSlug: string;
  projectSlug: string;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

export function ProjectTree({
  workspaceSlug,
  projectSlug,
  selectedFile,
  onSelectFile,
}: ProjectTreeProps) {
  const { data, isLoading } = trpc.project.listFiles.useQuery({
    workspaceSlug,
    projectSlug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <FileTree
      files={data?.files ?? []}
      selectedFile={selectedFile}
      onSelectFile={onSelectFile}
    />
  );
}
