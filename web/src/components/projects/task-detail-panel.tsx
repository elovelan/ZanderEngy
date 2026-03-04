"use client";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const statusOptions = ["todo", "in_progress", "review", "done"] as const;

const statusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/10 text-blue-500",
  review: "bg-yellow-500/10 text-yellow-500",
  done: "bg-green-500/10 text-green-500",
};

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

  if (!task) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const deps = (task.dependencies as number[]) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
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
                  status: value as (typeof statusOptions)[number],
                })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
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
              className={cn("text-[10px]", statusColors[task.status])}
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
      </SheetContent>
    </Sheet>
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
      className={cn("text-[10px]", statusColors[task.status])}
    >
      #{task.id} {task.title}
    </Badge>
  );
}
