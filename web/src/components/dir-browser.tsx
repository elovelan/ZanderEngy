'use client';

import path from 'path';
import { useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { DynamicDocumentEditor } from '@/components/editor/dynamic-document-editor';
import { EngyThreadStore } from '@/components/editor/document-editor';
import { FileTree } from '@/components/file-tree';
import { RiFolderOpenLine } from '@remixicon/react';

export function DirFileTree({
  dirPath,
  selectedFile,
  onSelectFile,
}: {
  dirPath: string;
  selectedFile: string | null;
  onSelectFile: (relPath: string) => void;
}) {
  const { data, isLoading, error } = trpc.dir.listFiles.useQuery({ dirPath });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
        <RiFolderOpenLine className="size-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground text-center">Directory not found</p>
      </div>
    );
  }

  return (
    <FileTree
      files={data?.files ?? []}
      selectedFile={selectedFile}
      onSelectFile={onSelectFile}
      label={path.basename(dirPath) || dirPath}
    />
  );
}

export function DirFileEditor({
  dirPath,
  relPath,
  comments = true,
}: {
  dirPath: string;
  relPath: string;
  comments?: boolean;
}) {
  const utils = trpc.useUtils();
  const absoluteFilePath = path.join(dirPath, relPath);

  const threadStore = useMemo(
    () => (comments ? new EngyThreadStore(undefined, absoluteFilePath) : undefined),
    [comments, absoluteFilePath],
  );

  const { data, isLoading, error } = trpc.dir.read.useQuery({
    dirPath,
    filePath: relPath,
  });

  const writeMutation = trpc.dir.write.useMutation({
    onSuccess: () => utils.dir.read.invalidate({ dirPath, filePath: relPath }),
  });

  const handleSave = useCallback(
    (markdown: string) => {
      writeMutation.mutate({ dirPath, filePath: relPath, content: markdown });
    },
    [writeMutation, dirPath, relPath],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <p className="text-sm font-medium">Failed to load file</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DynamicDocumentEditor
        key={absoluteFilePath}
        initialMarkdown={data?.content ?? ''}
        onSave={handleSave}
        comments={comments}
        threadStore={threadStore}
        filePath={relPath}
        mentionDirs={[dirPath]}
      />
    </div>
  );
}

export function DirEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <RiFolderOpenLine className="size-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">Select a file to edit</p>
    </div>
  );
}
