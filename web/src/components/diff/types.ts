export type GitFileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface ChangedFile {
  path: string;
  status: GitFileStatus;
  staged: boolean;
  additions?: number;
  deletions?: number;
}

export type ViewMode = 'split' | 'unified';
export type DiffViewMode = 'latest' | 'history' | 'branch';

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}
