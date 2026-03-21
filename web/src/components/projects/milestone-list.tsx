'use client';

import { useState } from 'react';
import { RiArrowRightSLine, RiHammerLine } from '@remixicon/react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MilestoneStatusBadge } from './milestone-status-badge';
import { MilestoneQuickActions } from './milestone-quick-actions';
import { TaskCard } from './task-card';
import { useQuickAction } from '@/hooks/use-quick-action';
import { cn } from '@/lib/utils';

type Milestone = {
  ref: string;
  num: number;
  title: string;
  status: string;
  scope?: string | null;
  filename: string;
};

export function sortMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const aComplete = a.status === 'complete' ? 1 : 0;
    const bComplete = b.status === 'complete' ? 1 : 0;
    if (aComplete !== bComplete) return aComplete - bComplete;
    return a.num - b.num;
  });
}

export function MilestoneList({
  projectId,
  milestones,
  showDone,
}: {
  projectId: number;
  milestones: Milestone[];
  showDone: boolean;
}) {
  const sorted = sortMilestones(milestones);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((ms) => (
        <MilestoneRow key={ms.ref} projectId={projectId} milestone={ms} showDone={showDone} />
      ))}
      {sorted.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">No milestones yet</p>
      )}
    </div>
  );
}

function MilestoneRow({
  projectId,
  milestone,
  showDone,
}: {
  projectId: number;
  milestone: Milestone;
  showDone: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: tasks } = trpc.task.list.useQuery({ milestoneRef: milestone.ref });
  const { data: taskGroups, isLoading: groupsLoading } = trpc.taskGroup.list.useQuery(
    { milestoneRef: milestone.ref },
    { enabled: open },
  );

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === 'done').length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const ungroupedTasks = tasks?.filter((t) => !t.taskGroupId) ?? [];
  const visibleUngrouped = showDone
    ? ungroupedTasks
    : ungroupedTasks.filter((t) => t.status !== 'done');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border">
        <CollapsibleTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="flex w-full cursor-pointer items-center gap-3 p-3 text-left hover:bg-muted"
          >
            <RiArrowRightSLine
              className={cn('size-4 shrink-0 text-muted-foreground transition-transform', {
                'rotate-90': open,
              })}
            />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">M{milestone.num}</span>
                <span className="text-xs font-medium">{milestone.title}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  {done < total && <MilestoneQuickActions milestoneRef={milestone.ref} />}
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <MilestoneStatusBadge
                    projectId={projectId}
                    filename={milestone.filename}
                    status={milestone.status}
                    clickable
                  />
                </span>
              </div>
              {milestone.scope && (
                <p className="text-xs text-muted-foreground line-clamp-1">{milestone.scope}</p>
              )}
            </div>
            <div className="flex w-32 items-center gap-2">
              <Progress value={pct} className="flex-1" />
              <span className="text-[10px] text-muted-foreground">
                {done}/{total}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-1 border-t border-border px-3 py-2">
            {groupsLoading && (
              <p className="py-2 text-center text-xs text-muted-foreground">Loading...</p>
            )}
            {taskGroups?.map((tg) => (
              <TaskGroupRow
                key={tg.id}
                taskGroup={tg}
                milestoneRef={milestone.ref}
                showDone={showDone}
              />
            ))}
            {visibleUngrouped.length > 0 && (
              <div className="flex flex-col">
                <p className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
                  Other tasks
                </p>
                {visibleUngrouped.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
            {!groupsLoading && (taskGroups?.length ?? 0) === 0 && ungroupedTasks.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">No task groups</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TaskGroupRow({
  taskGroup,
  milestoneRef,
  showDone,
}: {
  taskGroup: { id: number; milestoneRef: string | null; name: string; status: string };
  milestoneRef: string;
  showDone: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: tasks } = trpc.task.list.useQuery(
    { taskGroupId: taskGroup.id },
    { enabled: open },
  );

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === 'done').length ?? 0;
  const visibleTasks = showDone ? (tasks ?? []) : (tasks ?? []).filter((t) => t.status !== 'done');
  const allDone = total > 0 && done === total;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-sm">
        <CollapsibleTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
          >
            <RiArrowRightSLine
              className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', {
                'rotate-90': open,
              })}
            />
            <span className="flex-1 text-xs font-medium">{taskGroup.name}</span>
            <TaskGroupQuickAction taskGroupId={taskGroup.id} milestoneRef={milestoneRef} />
            {open && total > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {done}/{total}
              </span>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="ml-5 flex flex-col border-l border-border">
            {visibleTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {!showDone && allDone && (
              <p className="py-2 text-center text-xs text-muted-foreground">All tasks done</p>
            )}
            {total === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">No tasks</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TaskGroupQuickAction({
  taskGroupId,
  milestoneRef,
}: {
  taskGroupId: number;
  milestoneRef: string;
}) {
  const { disabled, launch, projectSlug } = useQuickAction();

  function handleImplementTaskGroup() {
    launch({
      prompt: `Use /engy:implement-milestone for ${milestoneRef} TG${taskGroupId} in project ${projectSlug}`,
      scopeLabel: `impl-tg: ${milestoneRef} TG${taskGroupId}`,
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
              handleImplementTaskGroup();
            }}
          >
            <RiHammerLine className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Implement Task Group</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
