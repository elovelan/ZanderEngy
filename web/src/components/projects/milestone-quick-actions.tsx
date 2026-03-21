'use client';

import { RiHammerLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuickAction } from '@/hooks/use-quick-action';

interface MilestoneQuickActionsProps {
  milestoneRef: string;
}

export function MilestoneQuickActions({ milestoneRef }: MilestoneQuickActionsProps) {
  const { disabled, launch, projectSlug } = useQuickAction();

  function handleImplementMilestone() {
    launch({
      prompt: `Use /engy:implement-milestone for ${milestoneRef} in project ${projectSlug}`,
      scopeLabel: `impl-ms: ${milestoneRef}`,
    });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleImplementMilestone();
            }}
          >
            <RiHammerLine className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Implement Milestone</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
