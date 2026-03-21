'use client';

import { useTerminalScope } from './use-terminal-scope';
import { TerminalManager } from './terminal-manager';
import type { TerminalDropdownGroup } from './types';

interface TerminalPanelProps {
  onCollapse?: () => void;
  extraDropdownGroups?: TerminalDropdownGroup[];
  containerEnabled?: boolean;
}

const noop = () => {};

export function TerminalPanel({ onCollapse, extraDropdownGroups, containerEnabled }: TerminalPanelProps) {
  const scope = useTerminalScope();
  const scopeKey = scope.groupKey;

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#0a0a0a]">
      <TerminalManager
        key={scopeKey}
        onCollapse={onCollapse ?? noop}
        defaultScope={scope}
        extraDropdownGroups={extraDropdownGroups}
        containerEnabled={containerEnabled}
      />
    </div>
  );
}
