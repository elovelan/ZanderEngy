"use client";

import { Badge } from "@/components/ui/badge";
import { TaskStatusBadge } from "@/components/projects/task-status-badge";

type Task = {
  id: number;
  title: string;
  status: string;
  type: string;
  importance: string | null;
  urgency: string | null;
};

type Quadrant = {
  label: string;
  importance: string;
  urgency: string;
};

const quadrants: Quadrant[] = [
  { label: "Urgent + Important", importance: "important", urgency: "urgent" },
  { label: "Not Urgent + Important", importance: "important", urgency: "not_urgent" },
  { label: "Urgent + Not Important", importance: "not_important", urgency: "urgent" },
  {
    label: "Not Urgent + Not Important",
    importance: "not_important",
    urgency: "not_urgent",
  },
];

export function EisenhowerMatrix({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick?: (taskId: number) => void;
}) {
  function tasksForQuadrant(q: Quadrant) {
    return tasks.filter(
      (t) =>
        (t.importance ?? "not_important") === q.importance &&
        (t.urgency ?? "not_urgent") === q.urgency,
    );
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-px bg-border" style={{ minHeight: 400 }}>
      {quadrants.map((q) => (
        <div
          key={q.label}
          className="flex flex-col gap-2 bg-background p-3"
        >
          <span className="text-xs font-medium text-muted-foreground">{q.label}</span>
          <div className="flex flex-col gap-1">
            {tasksForQuadrant(q).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick?.(task.id)}
                className="flex items-center gap-2 rounded-none border border-border p-2 text-left text-xs transition-colors hover:bg-muted"
              >
                <span className="flex-1 truncate">{task.title}</span>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {task.type}
                </Badge>
                <TaskStatusBadge
                  taskId={task.id}
                  status={task.status}
                  clickable
                  className="shrink-0"
                />
              </button>
            ))}
            {tasksForQuadrant(q).length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
