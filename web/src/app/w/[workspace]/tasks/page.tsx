"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { EisenhowerMatrix } from "@/components/projects/task-views/eisenhower-matrix";
import { TaskDetailPanel } from "@/components/projects/task-detail-panel";
import { TaskForm } from "@/components/projects/task-form";
import { Button } from "@/components/ui/button";
import { RiAddLine } from "@remixicon/react";

export default function TasksPage() {
  const params = useParams<{ workspace: string }>();
  const { data: workspace } = trpc.workspace.get.useQuery({ slug: params.workspace });
  const { data: allProjects } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? 0 },
    { enabled: !!workspace },
  );

  const defaultProject = allProjects?.find((p) => p.isDefault);

  const { data: tasks } = trpc.task.list.useQuery(
    { projectId: defaultProject?.id ?? 0 },
    { enabled: !!defaultProject },
  );

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);

  const utils = trpc.useUtils();

  function handleTaskCreated() {
    setShowNewTask(false);
    utils.task.list.invalidate();
  }

  if (!workspace || !defaultProject) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tasks</h2>
        <Button size="sm" onClick={() => setShowNewTask(true)}>
          <RiAddLine data-icon="inline-start" />
          New Task
        </Button>
      </div>

      <EisenhowerMatrix tasks={tasks ?? []} onTaskClick={setSelectedTaskId} />

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={selectedTaskId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />

      <TaskForm
        projectId={defaultProject.id}
        open={showNewTask}
        onOpenChange={setShowNewTask}
        onCreated={handleTaskCreated}
      />
    </div>
  );
}
