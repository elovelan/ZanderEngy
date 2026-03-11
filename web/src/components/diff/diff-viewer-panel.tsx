'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Diff, Hunk, parseDiff, getChangeKey, type GutterOptions } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import './diff-styles.css';
import { CommentWidget } from './comment-widget';
import type { DiffComment } from './use-diff-comments';
import type { ViewMode } from './types';

interface DiffViewerPanelProps {
  diff: string;
  viewMode: ViewMode;
  filePath?: string;
  fileComments?: DiffComment[];
  onAddComment?: (lineNumber: number, codeLine: string, changeKey: string, text: string) => void;
  onReply?: (threadId: string, text: string) => void;
  onResolve?: (threadId: string) => void;
  onDelete?: (threadId: string) => void;
}

export function DiffViewerPanel({
  diff,
  viewMode,
  filePath,
  fileComments = [],
  onAddComment,
  onReply,
  onResolve,
  onDelete,
}: DiffViewerPanelProps) {
  const [activeCommentKey, setActiveCommentKey] = useState<string | null>(null);

  const file = useMemo(() => {
    if (!diff) return null;
    const files = parseDiff(diff);
    return files[0] ?? null;
  }, [diff]);

  const widgets = useMemo(() => {
    const w: Record<string, ReactNode> = {};

    for (const comment of fileComments) {
      if (comment.changeKey) {
        w[comment.changeKey] = (
          <CommentWidget
            existingComments={comment}
            onSave={() => {}}
            onReply={onReply}
            onResolve={onResolve}
            onDelete={onDelete}
            onCancel={() => {}}
          />
        );
      }
    }

    if (activeCommentKey && !fileComments.some((c) => c.changeKey === activeCommentKey)) {
      w[activeCommentKey] = (
        <CommentWidget
          onSave={(text) => {
            if (onAddComment) {
              const lineNumber = parseInt(activeCommentKey.slice(1), 10) || 0;
              onAddComment(lineNumber, '', activeCommentKey, text);
            }
            setActiveCommentKey(null);
          }}
          onCancel={() => setActiveCommentKey(null)}
        />
      );
    }

    return w;
  }, [fileComments, activeCommentKey, onAddComment, onReply, onResolve, onDelete]);

  const renderGutter = useCallback(
    ({ change, renderDefault }: GutterOptions) => {
      const key = getChangeKey(change);

      return (
        <span className="group/gutter relative inline-flex items-center w-full">
          {onAddComment && (
            <button
              className="diff-gutter-add-button absolute left-0 top-0"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCommentKey(key);
              }}
              title="Add comment"
            >
              +
            </button>
          )}
          {renderDefault()}
        </span>
      );
    },
    [onAddComment],
  );

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No file selected
      </div>
    );
  }

  if (diff === '') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No changes detected
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Unable to parse diff
      </div>
    );
  }

  return (
    <div className="diff-viewer overflow-auto">
      <Diff
        viewType={viewMode}
        diffType={file.type}
        hunks={file.hunks}
        widgets={widgets}
        renderGutter={onAddComment ? renderGutter : undefined}
      >
        {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
      </Diff>
    </div>
  );
}
