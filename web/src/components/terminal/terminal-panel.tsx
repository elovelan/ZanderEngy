"use client";

import { useTerminalScope } from "./use-terminal-scope";
import { useTerminalContext } from "./terminal-provider";
import { TerminalManager } from "./terminal-manager";

export function TerminalPanel() {
  const scope = useTerminalScope();
  const { toggleCollapsed } = useTerminalContext();

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <TerminalManager onCollapse={toggleCollapsed} defaultScope={scope} />
    </div>
  );
}
