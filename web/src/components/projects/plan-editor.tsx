"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicDocumentEditor } from "@/components/editor/dynamic-document-editor";
import { cn } from "@/lib/utils";
import { RiEditLine } from "@remixicon/react";

type Milestone = {
  id: number;
  title: string;
  status: string;
  sortOrder: number;
};

const milestoneStatusColors: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  planning: "bg-blue-500/10 text-blue-500",
  active: "bg-yellow-500/10 text-yellow-500",
  complete: "bg-green-500/10 text-green-500",
};

export function PlanEditor({
  milestones,
}: {
  milestones: Milestone[];
}) {
  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">No milestones</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {sorted.map((ms) => (
        <MilestonePlanSection key={ms.id} milestone={ms} />
      ))}
    </div>
  );
}

function MilestonePlanSection({ milestone }: { milestone: Milestone }) {
  const { data: planContent } = trpc.planContent.get.useQuery({ milestoneId: milestone.id });
  const [editing, setEditing] = useState(false);

  const utils = trpc.useUtils();
  const upsertPlan = trpc.planContent.upsert.useMutation({
    onSuccess: () => utils.planContent.get.invalidate(),
  });

  const updateMilestone = trpc.milestone.update.useMutation({
    onSuccess: () => utils.milestone.list.invalidate(),
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(
    (markdown: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        upsertPlan.mutate({ milestoneId: milestone.id, content: markdown });
      }, 1500);
    },
    [milestone.id, upsertPlan],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function handlePlanMilestone() {
    if (milestone.status === "planned") {
      updateMilestone.mutate({ id: milestone.id, status: "planning" });
    }
  }

  const content = planContent?.content ?? "";

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{milestone.title}</span>
          <Badge
            variant="outline"
            className={cn("text-[10px]", milestoneStatusColors[milestone.status])}
          >
            {milestone.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {milestone.status === "planned" && (
            <Button
              size="xs"
              variant="outline"
              onClick={handlePlanMilestone}
              disabled={updateMilestone.isPending}
            >
              Plan Milestone
            </Button>
          )}
          {!editing && (
            <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
              <RiEditLine data-icon="inline-start" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="p-3">
        {editing ? (
          <DynamicDocumentEditor initialMarkdown={content || "# Plan\n"} onSave={handleSave} />
        ) : content ? (
          <div className="prose prose-sm prose-invert max-w-none text-xs">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{content}</pre>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">No plan yet</p>
        )}
      </div>
    </div>
  );
}
