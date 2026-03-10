"use client";

import { useCallback } from "react";
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
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.project.listFiles.useQuery({
    workspaceSlug,
    projectSlug,
  });

  const writeMutation = trpc.project.writeFile.useMutation({
    onSuccess: () => utils.project.listFiles.invalidate({ workspaceSlug, projectSlug }),
  });

  const mkdirMutation = trpc.project.mkdir.useMutation({
    onSuccess: () => utils.project.listFiles.invalidate({ workspaceSlug, projectSlug }),
  });

  const handleCreateFile = useCallback(
    (relDir: string, fileName: string) => {
      const filePath = relDir ? `${relDir}/${fileName}` : fileName;
      writeMutation.mutate(
        { workspaceSlug, projectSlug, filePath, content: "" },
        { onSuccess: () => onSelectFile(filePath) },
      );
    },
    [writeMutation, workspaceSlug, projectSlug, onSelectFile],
  );

  const handleCreateDir = useCallback(
    (subDir: string) => {
      mkdirMutation.mutate({ workspaceSlug, projectSlug, subDir });
    },
    [mkdirMutation, workspaceSlug, projectSlug],
  );

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
      dirs={data?.dirs ?? []}
      selectedFile={selectedFile}
      onSelectFile={onSelectFile}
      onCreateFile={handleCreateFile}
      onCreateDir={handleCreateDir}
    />
  );
}
