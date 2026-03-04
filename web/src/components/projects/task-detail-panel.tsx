"use client";

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

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {task.description && (
            <p className="text-xs text-muted-foreground">{task.description}</p>
          )}

          <div className="flex flex-col gap-2">
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
              <SelectTrigger className="h-7 text-xs">
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

          <div className="flex gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {task.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px]", taskStatusColors[task.status])}
            >
              {task.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">Priority</span>
            <span className="text-xs text-muted-foreground">
              {(task.importance ?? "not_important").replace("_", " ")} /{" "}
              {(task.urgency ?? "not_urgent").replace("_", " ")}
            </span>
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
