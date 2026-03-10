"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
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

  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const utils = trpc.useUtils();

  return (
    <div className="flex flex-col gap-6 py-6">
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
