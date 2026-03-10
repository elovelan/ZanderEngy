"use client";

import { useMemo, useState } from "react";
import { TreeView, type TreeDataItem } from "@/components/tree-view";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiAddLine,
  RiFileAddLine,
  RiFileTextLine,
  RiFolderAddLine,
  RiFolderLine,
  RiSearchLine,
  RiSortAsc,
  RiSortDesc,
} from "@remixicon/react";

type FileEntry = { path: string; mtime: number };
type SortMode = "modified" | "name";
type SortDir = "asc" | "desc";

interface FileTreeProps {
  files: FileEntry[];
  dirs?: string[];
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  label?: string;
  onCreateFile?: (dirPath: string, fileName: string) => void;
  onCreateDir?: (dirPath: string) => void;
}

interface DirNode {
  children: Map<string, DirNode>;
  files: { name: string; path: string; mtime: number }[];
  maxMtime: number;
}

function buildTrie(files: FileEntry[], dirs: string[]): DirNode {
  const root: DirNode = { children: new Map(), files: [], maxMtime: 0 };

  for (const f of files) {
    const parts = f.path.split("/");
    const fileName = parts.pop()!;
    let node = root;
    for (const segment of parts) {
      if (!node.children.has(segment)) {
        node.children.set(segment, { children: new Map(), files: [], maxMtime: 0 });
      }
      node = node.children.get(segment)!;
      if (f.mtime > node.maxMtime) node.maxMtime = f.mtime;
    }
    node.files.push({ name: fileName, path: f.path, mtime: f.mtime });
  }

  // Ensure empty directories are represented in the trie
  for (const d of dirs) {
    const parts = d.split("/");
    let node = root;
    for (const segment of parts) {
      if (!node.children.has(segment)) {
        node.children.set(segment, { children: new Map(), files: [], maxMtime: 0 });
      }
      node = node.children.get(segment)!;
    }
  }

  return root;
}

function trieToTreeItems(
  node: DirNode,
  parentPath: string,
  sortMode: SortMode,
  sortDir: SortDir,
  dirActions?: (dirPath: string) => React.ReactNode,
): TreeDataItem[] {
  const sortMul = sortDir === "asc" ? 1 : -1;

  const sortedFiles = [...node.files].sort((a, b) => {
    if (sortMode === "modified") return (a.mtime - b.mtime) * sortMul;
    return a.name.localeCompare(b.name) * sortMul;
  });

  const fileItems: TreeDataItem[] = sortedFiles.map((f) => ({
    id: f.path,
    name: f.name,
    icon: RiFileTextLine,
  }));

  const dirEntries = [...node.children.entries()];
  if (sortMode === "modified") {
    dirEntries.sort((a, b) => (a[1].maxMtime - b[1].maxMtime) * sortMul);
  } else {
    dirEntries.sort((a, b) => a[0].localeCompare(b[0]) * sortMul);
  }

  const dirItems: TreeDataItem[] = dirEntries.map(([dirName, dirNode]) => {
    const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName;
    return {
      id: `dir:${dirPath}`,
      name: dirName,
      icon: RiFolderLine,
      children: trieToTreeItems(dirNode, dirPath, sortMode, sortDir, dirActions),
      actions: dirActions?.(dirPath),
    };
  });

  return [...dirItems, ...fileItems];
}

function buildFileTree(
  files: FileEntry[],
  dirs: string[],
  sortMode: SortMode,
  sortDir: SortDir,
  filterText: string,
  dirActions?: (dirPath: string) => React.ReactNode,
): TreeDataItem[] {
  const lowerFilter = filterText.toLowerCase();
  const filtered = lowerFilter
    ? files.filter((f) => f.path.toLowerCase().includes(lowerFilter))
    : files;

  const filteredDirs = lowerFilter
    ? dirs.filter((d) => d.toLowerCase().includes(lowerFilter))
    : dirs;

  const root = buildTrie(filtered, filteredDirs);
  return trieToTreeItems(root, "", sortMode, sortDir, dirActions);
}

function CreateButton({
  dirPath,
  onCreateFile,
  onCreateDir,
  size = "sm",
}: {
  dirPath: string;
  onCreateFile?: (dirPath: string, fileName: string) => void;
  onCreateDir?: (dirPath: string) => void;
  size?: "sm" | "xs";
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "folder">("file");
  const [name, setName] = useState("");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (mode === "file") {
      const finalName = trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
      onCreateFile?.(dirPath, finalName);
    } else {
      onCreateDir?.(dirPath ? `${dirPath}/${trimmed}` : trimmed);
    }

    setDialogOpen(false);
    setName("");
  }

  function openMode(m: "file" | "folder") {
    setMode(m);
    setName("");
    setDialogOpen(true);
  }

  const iconSize = size === "xs" ? "size-3" : "size-3.5";
  const btnSize = size === "xs" ? "size-5" : "size-6";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex items-center justify-center ${btnSize} text-muted-foreground hover:text-foreground transition-colors`}
            title="New..."
            onClick={(e) => e.stopPropagation()}
          >
            <RiAddLine className={iconSize} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {onCreateFile && (
            <DropdownMenuItem onClick={() => openMode("file")}>
              <RiFileAddLine className="size-4" />
              New File
            </DropdownMenuItem>
          )}
          {onCreateDir && (
            <DropdownMenuItem onClick={() => openMode("folder")}>
              <RiFolderAddLine className="size-4" />
              New Folder
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{mode === "file" ? "New File" : "New Folder"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === "folder" ? "folder-name" : "filename.md"}
              className="h-8 text-sm"
            />
            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!name.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FileTree({
  files,
  dirs = [],
  selectedFile,
  onSelectFile,
  label = "Files",
  onCreateFile,
  onCreateDir,
}: FileTreeProps) {
  const [sortMode, setSortMode] = useState<SortMode>("modified");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterText, setFilterText] = useState("");

  const hasCreateActions = !!onCreateFile || !!onCreateDir;

  const dirActions = useMemo(
    () =>
      hasCreateActions
        ? (dirPath: string) => (
            <CreateButton
              dirPath={dirPath}
              onCreateFile={onCreateFile}
              onCreateDir={onCreateDir}
              size="xs"
            />
          )
        : undefined,
    [hasCreateActions, onCreateFile, onCreateDir],
  );

  const treeData: TreeDataItem[] = useMemo(
    () => buildFileTree(files, dirs, sortMode, sortDir, filterText, dirActions),
    [files, dirs, sortMode, sortDir, filterText, dirActions],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </h3>
        <div className="flex items-center gap-0.5">
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modified">Modified</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="flex items-center justify-center size-6 text-muted-foreground hover:text-foreground transition-colors"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? (
              <RiSortAsc className="size-3.5" />
            ) : (
              <RiSortDesc className="size-3.5" />
            )}
          </button>
          {hasCreateActions && (
            <CreateButton
              dirPath=""
              onCreateFile={onCreateFile}
              onCreateDir={onCreateDir}
            />
          )}
        </div>
      </div>
      <div className="relative px-3 py-1.5 border-b border-border">
        <RiSearchLine className="absolute left-5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter files..."
          className="h-6 pl-6 text-xs border-0 bg-transparent focus-visible:ring-0"
        />
      </div>
      <ScrollArea className="flex-1 [&>[data-slot=scroll-area-viewport]>div]:!block">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
            <p className="text-sm text-muted-foreground">
              {filterText ? "No matching files" : "No files yet"}
            </p>
          </div>
        ) : (
          <div className="p-2">
            <TreeView
              data={treeData}
              initialSelectedItemId={selectedFile ?? undefined}
              onSelectChange={(item) => {
                if (item && !item.children) onSelectFile(item.id);
              }}
              expandAll={false}
              defaultLeafIcon={RiFileTextLine}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
