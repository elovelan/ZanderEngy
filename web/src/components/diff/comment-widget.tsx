'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import type { DiffComment } from './use-diff-comments';

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface CommentWidgetProps {
  existingComments?: DiffComment;
  onSave: (text: string) => void;
  onReply?: (threadId: string, text: string) => void;
  onResolve?: (threadId: string) => void;
  onDelete?: (threadId: string) => void;
  onCancel: () => void;
}

export function CommentWidget({
  existingComments,
  onSave,
  onReply,
  onResolve,
  onDelete,
  onCancel,
}: CommentWidgetProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!text.trim()) return;
        if (existingComments && onReply) {
          onReply(existingComments.threadId, text.trim());
        } else {
          onSave(text.trim());
        }
        setText('');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [text, existingComments, onReply, onSave, onCancel],
  );

  const handleSubmit = () => {
    if (!text.trim()) return;
    if (existingComments && onReply) {
      onReply(existingComments.threadId, text.trim());
    } else {
      onSave(text.trim());
    }
    setText('');
  };

  return (
    <div className="border border-border bg-background p-3" onClick={(e) => e.stopPropagation()}>
      {existingComments && existingComments.comments.length > 0 && (
        <div className="mb-2">
          {existingComments.comments.map((c, i) => (
            <div
              key={c.id}
              className={cn(
                'py-1.5 text-xs',
                i > 0 && 'border-t border-border/50 ml-3',
                existingComments.resolved && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-medium text-muted-foreground">
                  {i === 0 ? 'Comment' : 'Reply'}
                </span>
                {c.createdAt && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatRelativeTime(c.createdAt)}
                  </span>
                )}
              </div>
              <span className={cn('whitespace-pre-wrap', existingComments.resolved && 'line-through')}>
                {typeof c.body === 'string' ? c.body : JSON.stringify(c.body)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-1">
            {onResolve && !existingComments.resolved && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onResolve(existingComments.threadId)}
              >
                Resolve
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="xs"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(existingComments.threadId)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={existingComments ? 'Reply...' : 'Add a comment...'}
        className="min-h-[60px] resize-none text-xs"
        autoFocus
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Kbd>⌘↵</Kbd> save <Kbd>Esc</Kbd> cancel
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleSubmit} disabled={!text.trim()}>
            {existingComments ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
