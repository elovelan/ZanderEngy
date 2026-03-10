'use client';

import { RiMore2Line, RiDraftLine, RiHammerLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSendToTerminal } from '@/components/terminal/use-send-to-terminal';
import { trpc } from '@/lib/trpc';
import { shellEscape, buildAddDirFlags, buildQuickActionDirs } from '@/lib/shell';
import { toast } from 'sonner';
import type { TaskSkills } from '@/components/projects/types';

const DEFAULT_PLAN_SKILL = '/engy:planning';
const DEFAULT_IMPLEMENT_SKILL = '/engy:implement-plan';

interface TaskQuickActionsProps {
  taskId: number;
  workspaceSlug: string;
  projectDir?: string | null;
  planSlugs?: string[];
  repos?: string[];
  skills?: TaskSkills;
  needsPlan?: boolean;
}

export function TaskQuickActions({
  taskId,
  workspaceSlug,
  projectDir,
  planSlugs,
  repos = [],
  skills,
  needsPlan = true,
}: TaskQuickActionsProps) {
  const { openNewTerminal } = useSendToTerminal();
  const taskSlug = `${workspaceSlug}-T${taskId}`;
  const hasPlan = planSlugs?.includes(taskSlug) ?? false;

  const { workingDir, additionalDirs } = buildQuickActionDirs(repos, projectDir);
  const addDirFlags = buildAddDirFlags(additionalDirs);

  const planSkill = skills?.plan || DEFAULT_PLAN_SKILL;
  const implementSkill = skills?.implement || DEFAULT_IMPLEMENT_SKILL;

  const utils = trpc.useUtils();
  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate();
      utils.task.list.invalidate();
      utils.task.listBySpecId.invalidate();
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  function handlePlan() {
    if (!workingDir || !projectDir) return;
    const escapedDir = shellEscape(projectDir);
    const prompt = `Use ${planSkill} to plan ${taskSlug}, output plan to ${escapedDir}/plans/${taskSlug}.plan.md`;
    openNewTerminal({
      scopeType: 'project',
      scopeLabel: `plan: ${taskSlug}`,
      workingDir,
      command: `claude '${shellEscape(prompt)}'${addDirFlags}`,
    });
  }

  function handleImplement() {
    if (!workingDir || !projectDir) return;
    const escapedDir = shellEscape(projectDir);
    const prompt = needsPlan
      ? `Use ${implementSkill} for ${taskSlug}, plan at ${escapedDir}/plans/${taskSlug}.plan.md`
      : `Use ${implementSkill} for ${taskSlug}`;
    openNewTerminal({
      scopeType: 'project',
      scopeLabel: `impl: ${taskSlug}`,
      workingDir,
      command: `claude '${shellEscape(prompt)}'${addDirFlags}`,
    });
  }

  function handleToggleNeedsPlan() {
    updateTask.mutate({ id: taskId, needsPlan: !needsPlan });
  }

  const actionDisabled = !workingDir || !projectDir;
  const showImplement = !needsPlan || hasPlan;

  const tooltip = actionDisabled
    ? 'No project directory'
    : showImplement
      ? 'Start Implementing'
      : 'Start Planning';

  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              disabled={actionDisabled}
              onClick={showImplement ? handleImplement : handlePlan}
            >
              {showImplement ? <RiHammerLine className="size-3" /> : <RiDraftLine className="size-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground"
          >
            <RiMore2Line className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          {needsPlan && hasPlan && (
            <>
              <DropdownMenuItem disabled={actionDisabled} onClick={handlePlan}>
                <RiDraftLine className="size-4" />
                Replan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleToggleNeedsPlan}>
            {needsPlan ? 'Skip planning' : 'Require planning'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
