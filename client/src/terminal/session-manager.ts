import type { PersistentSession } from './types.js';

const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 30_000;

export class SessionManager {
  private readonly sessions = new Map<string, PersistentSession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  get(sessionId: string): PersistentSession | undefined {
    return this.sessions.get(sessionId);
  }

  set(sessionId: string, session: PersistentSession): void {
    this.sessions.set(sessionId, session);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  all(): PersistentSession[] {
    return Array.from(this.sessions.values());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (
        session.state === 'suspended' &&
        session.suspendedAt !== undefined &&
        now - session.suspendedAt > SESSION_EXPIRY_MS
      ) {
        try {
          session.ptyProcess.kill();
        } catch {
          // already dead
        }
        this.sessions.delete(id);
      }
    }
  }
}
