'use client';

import { cn } from '@/lib/utils';
import type { DiffViewMode } from './types';

const VIEW_MODES: Array<{ value: DiffViewMode; label: string }> = [
  { value: 'latest', label: 'Latest Changes' },
  { value: 'history', label: 'Commit History' },
  { value: 'branch', label: 'Branch Diff' },
];

interface ViewModeTabsProps {
  value: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}

export function ViewModeTabs({ value, onChange }: ViewModeTabsProps) {
  return (
    <div className="flex items-center gap-0.5 border-b border-border px-3">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            'relative px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
            value === mode.value &&
              'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground',
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
