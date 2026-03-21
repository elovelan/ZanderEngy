'use client';

import { RiLoader4Line, RiCheckboxCircleLine, RiErrorWarningLine } from '@remixicon/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ExecutionStatus = 'active' | 'paused' | 'stopped' | 'completed' | null;

interface ExecutionStatusIconProps {
  status: ExecutionStatus;
  className?: string;
}

const iconMap = {
  active: RiLoader4Line,
  paused: RiLoader4Line,
  completed: RiCheckboxCircleLine,
  stopped: RiErrorWarningLine,
} as const;

const tooltipMap: Record<string, string> = {
  active: 'Executing…',
  paused: 'Execution paused',
  completed: 'Execution complete',
  stopped: 'Execution stopped',
};

export function ExecutionStatusIcon({ status, className }: ExecutionStatusIconProps) {
  if (!status) return null;

  const Icon = iconMap[status];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon
            className={cn(
              'size-3 shrink-0',
              status === 'active' && 'animate-spin text-blue-500',
              status === 'paused' && 'text-yellow-500',
              status === 'completed' && 'text-green-500',
              status === 'stopped' && 'text-red-500',
              className,
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipMap[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
