'use client';

import path from 'path';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { RiFileTextLine, RiFolderLine, RiFolderOpenLine, RiLoader4Line } from '@remixicon/react';
import { ChevronRight } from 'lucide-react';

interface OpenDirTreeProps {
  dirPath: string;
  selectedFile: string | null;
  onSelectFile: (absolutePath: string) => void;
}

interface DirNodeProps {
  dirPath: string;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (absolutePath: string) => void;
}

const MAX_DEPTH = 5;

function DirNode({ dirPath, depth, selectedFile, onSelectFile }: DirNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const atMaxDepth = depth >= MAX_DEPTH;

  const { data, isLoading, error } = trpc.dir.list.useQuery(
    { dirPath },
    { enabled: expanded && !atMaxDepth },
  );

  if (depth === 0) {
    // Root level — always render contents directly (no toggle)
    return (
      <div>
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <RiLoader4Line className="size-3 animate-spin" />
            Loading...
          </div>
        )}
        {error && (
          <div className="px-3 py-2 text-xs text-destructive">{error.message}</div>
        )}
        {data && (
          <FileList
            dirPath={dirPath}
            dirs={data.dirs}
            files={data.files}
            depth={depth}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        )}
      </div>
    );
  }

  const dirName = path.basename(dirPath);
  const isExpanded = expanded && !!data;

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        disabled={atMaxDepth}
        onClick={() => setExpanded((v) => !v)}
      >
        <ChevronRight
          className={cn('size-3 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
        />
        {isExpanded ? (
          <RiFolderOpenLine className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <RiFolderLine className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{dirName}</span>
        {isLoading && <RiLoader4Line className="ml-auto size-3 animate-spin text-muted-foreground" />}
      </button>
      {isExpanded && data && (
        <FileList
          dirPath={dirPath}
          dirs={data.dirs}
          files={data.files}
          depth={depth}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
        />
      )}
    </div>
  );
}

interface FileListProps {
  dirPath: string;
  dirs: string[];
  files: string[];
  depth: number;
  selectedFile: string | null;
  onSelectFile: (absolutePath: string) => void;
}

function FileList({ dirPath, dirs, files, depth, selectedFile, onSelectFile }: FileListProps) {
  if (dirs.length === 0 && files.length === 0) {
    return (
      <p className="px-3 py-1 text-xs text-muted-foreground" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
        No markdown files
      </p>
    );
  }

  return (
    <>
      {depth < MAX_DEPTH &&
        dirs.map((dir) => (
          <DirNode
            key={dir}
            dirPath={path.join(dirPath, dir)}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      {files.map((file) => {
        const absolutePath = path.join(dirPath, file);
        const isSelected = selectedFile === absolutePath;
        return (
          <button
            key={file}
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-accent/50',
              isSelected && 'bg-accent/70 text-accent-foreground',
            )}
            style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            onClick={() => onSelectFile(absolutePath)}
          >
            <RiFileTextLine className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{file}</span>
          </button>
        );
      })}
    </>
  );
}

export function OpenDirTree({ dirPath, selectedFile, onSelectFile }: OpenDirTreeProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <h3 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {path.basename(dirPath) || dirPath}
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <DirNode
          dirPath={dirPath}
          depth={0}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
        />
      </ScrollArea>
    </div>
  );
}
