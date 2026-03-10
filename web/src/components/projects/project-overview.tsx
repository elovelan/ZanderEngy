"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MilestoneList } from "./milestone-list";
import { MilestoneForm } from "./milestone-form";
import { RiAddLine } from "@remixicon/react";

type Project = {
  id: number;
  name: string;
  slug: string;
  status: string;
  projectDir: string | null;
  workspaceId: number;
};

export function ProjectOverview({ project }: { project: Project }) {
  const { data: milestones } = trpc.milestone.list.useQuery({ projectId: project.id });
  const { data: tasks } = trpc.task.list.useQuery({ projectId: project.id });

  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const utils = trpc.useUtils();

  const totalTasks = tasks?.length ?? 0;
  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-3">
        <Progress value={pct} className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {doneTasks}/{totalTasks} tasks
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold">Milestones</h3>
          <Button size="xs" variant="ghost" onClick={() => setShowMilestoneForm(true)}>
            <RiAddLine data-icon="inline-start" />
            Add
          </Button>
        </div>
        <MilestoneList projectId={project.id} milestones={milestones ?? []} />
      </div>

      <MilestoneForm
        projectId={project.id}
        open={showMilestoneForm}
        onOpenChange={setShowMilestoneForm}
        onCreated={() => {
          setShowMilestoneForm(false);
          utils.milestone.list.invalidate();
        }}
      />
    </div>
  );
}
