"use client";

import {
  RiFolderLine,
  RiLayoutGridLine,
  RiFileTextLine,
  RiFileCodeLine,
  RiFolderOpenLine,
  RiTerminalLine,
  RiCloseLine,
  RiAddLine,
  RiArrowRightSLine,
} from "@remixicon/react";
import type { TerminalTab } from "./types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function collapseLabel(label: string): string {
  const parts = label.split('/').filter(Boolean);
  if (parts.length <= 2) return label;
  return `/${parts[0]}/.../${parts[parts.length - 1]}`;
}

const SCOPE_ICONS: Record<string, React.ElementType> = {
  project: RiFolderLine,
  workspace: RiLayoutGridLine,
  docs: RiFileTextLine,
  spec: RiFileCodeLine,
  dir: RiFolderOpenLine,
};

interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onAdd: () => void;
  onCollapse: () => void;
}

export function TerminalTabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
  onCollapse,
}: TerminalTabBarProps) {
  return (
    <div className="flex h-8 items-center border-b border-border bg-background shrink-0">
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {tabs.map((tab) => {
          const ScopeIcon = SCOPE_ICONS[tab.scope.scopeType] ?? RiTerminalLine;
          return (
            <div
              key={tab.sessionId}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(tab.sessionId)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(tab.sessionId); }}
              className={cn(
                "group flex h-8 max-w-[180px] items-center gap-1.5 border-r border-border px-2.5 text-xs transition-colors shrink-0 cursor-pointer",
                activeTabId === tab.sessionId
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                tab.status === 'exited' && "opacity-50",
              )}
            >
              <ScopeIcon className="size-[11px] shrink-0" />
              {tab.scope.scopeType === 'dir' ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="min-w-0 truncate">{collapseLabel(tab.scope.scopeLabel)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-mono">{tab.scope.scopeLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="min-w-0 truncate">{tab.scope.scopeLabel}</span>
              )}
              {tab.status === 'exited' && (
                <span className="shrink-0 text-[9px] text-muted-foreground">[exited]</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.sessionId);
                }}
                className={cn(
                  "ml-auto shrink-0 rounded-sm p-0.5 hover:bg-muted",
                  tab.sessionId === activeTabId ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
                aria-label="Close terminal"
              >
                <RiCloseLine className="size-[10px]" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center border-l border-border">
        <button
          onClick={onAdd}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Open new terminal"
          title="Open new terminal"
        >
          <RiAddLine className="size-3" />
        </button>
        <button
          onClick={onCollapse}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground border-l border-border"
          aria-label="Collapse terminal panel"
          title="Collapse (Ctrl+`)"
        >
          <RiArrowRightSLine className="size-3" />
        </button>
      </div>
    </div>
  );
}
