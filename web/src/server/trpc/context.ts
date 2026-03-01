import type WebSocket from 'ws';

export interface FileChangeEvent {
  workspaceSlug: string;
  path: string;
  eventType: 'add' | 'change' | 'unlink';
  timestamp: number;
}

export interface AppState {
  daemon: WebSocket | null;
  fileChanges: Map<string, FileChangeEvent[]>;
  pendingValidations: Map<
    string,
    {
      resolve: (results: Array<{ path: string; exists: boolean }>) => void;
      reject: (reason: Error) => void;
    }
  >;
}

let instance: AppState | null = null;

export function getAppState(): AppState {
  if (!instance) {
    instance = {
      daemon: null,
      fileChanges: new Map(),
      pendingValidations: new Map(),
    };
  }
  return instance;
}

export function resetAppState(): void {
  instance = null;
}
