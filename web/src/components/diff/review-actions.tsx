'use client';

import { useCallback } from 'react';
import { RiSendPlaneLine, RiFileCopyLine, RiCodeLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSendToTerminal } from '@/components/terminal/use-send-to-terminal';
import { generateDiffFeedback } from './feedback-markdown';
import type { DiffComment } from './use-diff-comments';

interface ReviewActionsProps {
  repoDir: string | null;
  diffComments: DiffComment[];
}

export function ReviewActions({ repoDir, diffComments }: ReviewActionsProps) {
  const { sendToTerminal, terminalActive } = useSendToTerminal();

  const unresolvedThreads = diffComments.filter((c) => !c.resolved);

  const buildFeedback = useCallback(() => {
    if (!repoDir) return '';
    const threads = unresolvedThreads.map((c) => ({
      documentPath: c.documentPath,
      metadata: { lineNumber: c.lineNumber, codeLine: c.codeLine },
      resolved: c.resolved,
      comments: c.comments.map((cm) => ({
        body: cm.body,
        userId: cm.userId ?? undefined,
        createdAt: cm.createdAt ?? undefined,
      })),
    }));
    return generateDiffFeedback(threads, repoDir);
  }, [repoDir, unresolvedThreads]);

  const handleSendFeedback = useCallback(() => {
    const feedback = buildFeedback();
    if (!feedback) return;
    sendToTerminal(feedback);
  }, [buildFeedback, sendToTerminal]);

  const handleCopyFeedback = useCallback(async () => {
    const feedback = buildFeedback();
    if (!feedback) return;
    await navigator.clipboard.writeText(feedback);
  }, [buildFeedback]);

  const handleOpenInVSCode = useCallback(() => {
    if (!repoDir) return;
    window.open(`vscode://file/${repoDir}`, '_blank');
  }, [repoDir]);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSendFeedback}
              disabled={unresolvedThreads.length === 0 || !terminalActive}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <RiSendPlaneLine className="size-3.5" />
              Send Feedback
              {unresolvedThreads.length > 0 && (
                <span className="text-muted-foreground">({unresolvedThreads.length})</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {unresolvedThreads.length === 0
              ? 'No unresolved comments to send'
              : !terminalActive
                ? 'No active terminal'
                : `Send ${unresolvedThreads.length} comment(s) to terminal`}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyFeedback}
              disabled={unresolvedThreads.length === 0}
              className="h-7 w-7 p-0"
            >
              <RiFileCopyLine className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy feedback to clipboard</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInVSCode}
              disabled={!repoDir}
              className="h-7 w-7 p-0"
            >
              <RiCodeLine className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in VS Code</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
