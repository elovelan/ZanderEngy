'use client';

import { Fragment } from 'react';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiBox3Line,
  RiSplitCellsHorizontal,
  RiSplitCellsVertical,
  RiTerminalLine,
} from '@remixicon/react';
import type { IDockviewHeaderActionsProps } from 'dockview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTerminalDock } from './terminal-dock-context';
import { toContainerScope } from './types';

export function TerminalDockActions({ activePanel }: IDockviewHeaderActionsProps) {
  const { openTerminal, onCollapse, extraDropdownGroups, containerEnabled, defaultScope } =
    useTerminalDock();

  return (
    <div className="flex shrink-0 items-center border-l border-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Add terminal"
            title="New terminal"
          >
            <RiAddLine className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              containerEnabled && defaultScope
                ? openTerminal({ ...defaultScope, containerMode: 'host' })
                : openTerminal()
            }
          >
            <RiAddLine className="size-3" />
            New Terminal
          </DropdownMenuItem>
          {containerEnabled && defaultScope && (
            <DropdownMenuItem
              onClick={() =>
                openTerminal(toContainerScope(defaultScope))
              }
            >
              <RiBox3Line className="size-3" />
              New Terminal (Container)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() =>
              openTerminal(undefined, { referencePanel: activePanel!.id, direction: 'right' })
            }
            disabled={!activePanel}
          >
            <RiSplitCellsHorizontal className="size-3" />
            Split Right
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              openTerminal(undefined, { referencePanel: activePanel!.id, direction: 'below' })
            }
            disabled={!activePanel}
          >
            <RiSplitCellsVertical className="size-3" />
            Split Down
          </DropdownMenuItem>

          {extraDropdownGroups?.map((group, gi) => (
            <Fragment key={gi}>
              <DropdownMenuSeparator />
              {group.label && (
                <DropdownMenuLabel className="text-[10px]">{group.label}</DropdownMenuLabel>
              )}
              {group.entries.map((entry) => {
                const Icon = entry.icon ?? RiTerminalLine;
                return (
                  <DropdownMenuItem
                    key={entry.id}
                    onClick={() => openTerminal(entry.scope)}
                    title={entry.tooltip}
                  >
                    <Icon className="size-3" />
                    <span className="truncate">{entry.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        onClick={onCollapse}
        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground border-l border-border"
        aria-label="Collapse terminal panel"
        title="Collapse (Ctrl+`)"
      >
        <RiArrowRightSLine className="size-3" />
      </button>
    </div>
  );
}
