'use client';

import { Fragment } from 'react';
import { RiTerminalLine, RiBox3Line, RiComputerLine } from '@remixicon/react';
import { useTerminalDock } from './terminal-dock-context';
import { toContainerScope } from './types';

export function TerminalDockWatermark() {
  const { openTerminal, extraDropdownGroups, containerEnabled, defaultScope } = useTerminalDock();

  const itemClass =
    'flex h-7 w-full items-center gap-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors';
  const labelClass =
    'border-t border-border/50 px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider';

  const hasProjectEntries = containerEnabled && defaultScope;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <p className="text-xs text-muted-foreground">No terminals open</p>

      <div className="flex w-64 flex-col overflow-hidden rounded border border-border/50">
        {hasProjectEntries && <p className={labelClass}>Claude in Project</p>}
        <button
          className={itemClass}
          onClick={() =>
            hasProjectEntries
              ? openTerminal({ ...defaultScope, containerMode: 'host' })
              : openTerminal()
          }
        >
          {hasProjectEntries ? (
            <RiComputerLine className="size-3 shrink-0" />
          ) : (
            <RiTerminalLine className="size-3 shrink-0" />
          )}
          <span className="truncate">{hasProjectEntries ? 'Host' : 'Open Terminal'}</span>
        </button>
        {hasProjectEntries && (
          <button
            className={itemClass}
            onClick={() => openTerminal(toContainerScope(defaultScope))}
          >
            <RiBox3Line className="size-3 shrink-0" />
            <span className="truncate">Container</span>
          </button>
        )}

        {extraDropdownGroups?.map((group, gi) => (
          <Fragment key={gi}>
            {group.label && <p className={labelClass}>{group.label}</p>}
            {group.entries.map((entry) => {
              const Icon = entry.icon ?? RiTerminalLine;
              return (
                <button
                  key={entry.id}
                  className={itemClass}
                  onClick={() => openTerminal(entry.scope)}
                  title={entry.tooltip}
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{entry.label}</span>
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
