"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicDocumentEditor } from "@/components/editor/dynamic-document-editor";
import { cn } from "@/lib/utils";
import { taskStatusOptions, taskStatusColors } from "./task-status-badge";
import { RiDeleteBinLine } from "@remixicon/react";

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: task } = trpc.task.get.useQuery(
    { id: taskId ?? 0 },
    { enabled: taskId !== null },
  );

  const utils = trpc.useUtils();
  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate();
      utils.task.list.invalidate();
    },
  });

  const deleteTask = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      onOpenChange(false);
    },
  });

  const handleDescriptionSave = useCallback(
    (markdown: string) => {
      if (!task) return;
      updateTask.mutate({ id: task.id, description: markdown });
    },
    [task, updateTask],
  );

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const deps = (task.dependencies as number[]) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Status</label>
              <Select
                value={task.status}
                onValueChange={(value) =>
                  updateTask.mutate({
                    id: task.id,
                    status: value as (typeof taskStatusOptions)[number],
                  })
                }
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Type</label>
              <Select
                value={task.type}
                onValueChange={(value) =>
                  updateTask.mutate({
                    id: task.id,
                    type: value as "ai" | "human",
                  })
                }
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">human</SelectItem>
                  <SelectItem value="ai">ai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Priority</span>
              <span className="text-xs text-muted-foreground">
                {(task.importance ?? "not_important").replace("_", " ")} /{" "}
                {(task.urgency ?? "not_urgent").replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Description</label>
            <div className="min-h-[200px] rounded-none border border-border">
              <DynamicDocumentEditor
                initialMarkdown={task.description || ""}
                onSave={handleDescriptionSave}
              />
            </div>
          </div>

          {deps.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Dependencies</span>
              <div className="flex flex-wrap gap-1">
                {deps.map((depId) => (
                  <DependencyBadge key={depId} taskId={depId} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => deleteTask.mutate({ id: task.id })}
          >
            <RiDeleteBinLine className="mr-1 size-3" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DependencyBadge({ taskId }: { taskId: number }) {
  const { data: task } = trpc.task.get.useQuery({ id: taskId });

  if (!task) {
    return (
      <Badge variant="outline" className="text-[10px]">
        #{taskId}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px]", taskStatusColors[task.status])}
    >
      #{task.id} {task.title}
    </Badge>
  );
}
