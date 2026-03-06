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
  specLastChanged: Map<string, number>;
  specDebounceTimers: Map<string, ReturnType<typeof setTimeout>>;
  /** Maps sessionId → browser WebSocket for terminal I/O relay */
  terminalSessions: Map<string, WebSocket>;
  /** Dedicated daemon WebSocket for terminal traffic (zero-parse relay) */
  terminalDaemon: WebSocket | null;
}

const GLOBAL_KEY = '__engy_app_state__' as const;

export function getAppState(): AppState {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      daemon: null,
      fileChanges: new Map(),
      pendingValidations: new Map(),
      specLastChanged: new Map(),
      specDebounceTimers: new Map(),
      terminalSessions: new Map(),
      terminalDaemon: null,
    };
  }
  return g[GLOBAL_KEY] as AppState;
}

export function resetAppState(): void {
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = undefined;
}
