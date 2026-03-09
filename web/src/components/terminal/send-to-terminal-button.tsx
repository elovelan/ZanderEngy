'use client';

import { useCallback } from 'react';
import { RiTerminalLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTerminalActive } from './use-terminal-active';

interface SendToTerminalButtonProps {
  getContent: () => string;
  className?: string;
}

export function SendToTerminalButton({ getContent, className }: SendToTerminalButtonProps) {
  const terminalActive = useTerminalActive();

  const handleClick = useCallback(() => {
    const content = getContent();
    if (!content) return;

    window.dispatchEvent(
      new CustomEvent('terminal:inject', {
        detail: { context: content },
      }),
    );
    // Send Enter as a separate event so the PTY processes the content first
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('terminal:inject', {
          detail: { context: '\r' },
        }),
      );
    }, 50);
  }, [getContent]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={!terminalActive}
            className={className ?? 'h-6 w-6 p-0'}
          >
            <RiTerminalLine className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Send comments to terminal</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
