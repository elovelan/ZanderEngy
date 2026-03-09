"use client";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const milestoneStatusOptions = ["planned", "planning", "active", "complete"] as const;
type MilestoneStatus = (typeof milestoneStatusOptions)[number];

const milestoneStatusColors: Record<MilestoneStatus, string> = {
  planned: "bg-muted text-muted-foreground",
  planning: "bg-blue-500/10 text-blue-500",
  active: "bg-yellow-500/10 text-yellow-500",
  complete: "bg-green-500/10 text-green-500",
};

function nextStatus(current: string): MilestoneStatus {
  const idx = milestoneStatusOptions.indexOf(current as MilestoneStatus);
  if (idx === -1 || idx === milestoneStatusOptions.length - 1) return milestoneStatusOptions[0];
  return milestoneStatusOptions[idx + 1];
}

export function MilestoneStatusBadge({
  projectId,
  filename,
  status,
  clickable = false,
  className,
}: {
  projectId: number;
  filename: string;
  status: string;
  clickable?: boolean;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const updateMilestone = trpc.milestone.update.useMutation({
    onSuccess: () => {
      utils.milestone.list.invalidate();
    },
  });

  function handleClick(e: React.MouseEvent) {
    if (!clickable) return;
    e.stopPropagation();
    updateMilestone.mutate({ projectId, filename, status: nextStatus(status) });
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px]",
        milestoneStatusColors[status as MilestoneStatus],
        clickable && "cursor-pointer hover:ring-1 hover:ring-foreground/20",
        className,
      )}
      onClick={clickable ? handleClick : undefined}
    >
      {status}
    </Badge>
  );
}
