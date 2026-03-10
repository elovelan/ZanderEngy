'use client';

import { trpc } from '@/lib/trpc';
import { FileTree } from '@/components/file-tree';

interface WorkspaceTreeProps {
  dirPath: string;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

export function WorkspaceTree({ dirPath, selectedFile, onSelectFile }: WorkspaceTreeProps) {
  const { data, isLoading } = trpc.dir.listFiles.useQuery({ dirPath });

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
