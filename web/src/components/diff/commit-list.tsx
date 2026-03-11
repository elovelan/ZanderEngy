'use client';

import { cn } from '@/lib/utils';
import type { CommitInfo } from './types';

interface CommitListProps {
  commits: CommitInfo[];
  selectedHash: string | null;
  onSelectCommit: (hash: string) => void;
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CommitList({ commits, selectedHash, onSelectCommit, isLoading }: CommitListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading commits...</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">No commits found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-auto">
      {commits.map((commit) => (
        <button
          key={commit.hash}
          onClick={() => onSelectCommit(commit.hash)}
          className={cn(
            'flex flex-col gap-0.5 border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50',
            selectedHash === commit.hash && 'bg-muted',
          )}
        >
          <span className="truncate text-xs font-medium text-foreground">{commit.message}</span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-mono">{commit.hash.slice(0, 7)}</span>
            <span>{commit.author}</span>
            <span>{formatDate(commit.date)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
