"use client";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const taskStatusOptions = ["todo", "in_progress", "review", "done"] as const;
type TaskStatus = (typeof taskStatusOptions)[number];

export const taskStatusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/10 text-blue-500",
  review: "bg-yellow-500/10 text-yellow-500",
  done: "bg-green-500/10 text-green-500",
};

function nextStatus(current: string): TaskStatus {
  const idx = taskStatusOptions.indexOf(current as TaskStatus);
  if (idx === -1 || idx === taskStatusOptions.length - 1) return taskStatusOptions[0];
  return taskStatusOptions[idx + 1];
}

export function TaskStatusBadge({
  taskId,
  status,
  clickable = false,
  className,
}: {
  taskId: number;
  status: string;
  clickable?: boolean;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate();
      utils.task.list.invalidate();
    },
  });

  function handleClick(e: React.MouseEvent) {
    if (!clickable) return;
    e.stopPropagation();
    updateTask.mutate({ id: taskId, status: nextStatus(status) });
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px]",
        taskStatusColors[status],
        clickable && "cursor-pointer hover:ring-1 hover:ring-foreground/20",
        className,
      )}
      onClick={clickable ? handleClick : undefined}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
