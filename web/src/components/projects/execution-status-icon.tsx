'use client';

import { RiLoader4Line, RiCheckboxCircleLine, RiErrorWarningLine } from '@remixicon/react';
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

export function ExecutionStatusIcon({ status, className }: ExecutionStatusIconProps) {
  if (!status) return null;

  const Icon = iconMap[status];

  return (
    <Icon
      className={cn(
        'size-3',
        status === 'active' && 'animate-spin text-blue-500',
        status === 'paused' && 'text-yellow-500',
        status === 'completed' && 'text-green-500',
        status === 'stopped' && 'text-red-500',
        className,
      )}
    />
  );
}
