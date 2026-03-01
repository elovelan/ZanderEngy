import path from 'node:path';
import { watch, type FSWatcher, type ChokidarOptions } from 'chokidar';
import type { WsClient } from './ws/client.js';

interface SpecWatcherOptions {
  usePolling?: boolean;
}

export class SpecWatcher {
  private watchers = new Map<string, FSWatcher>();
  private readonly engyDir: string;
  private readonly wsClient: WsClient;
  private readonly options: SpecWatcherOptions;

  constructor(engyDir: string, wsClient: WsClient, options: SpecWatcherOptions = {}) {
    this.engyDir = engyDir;
    this.wsClient = wsClient;
    this.options = options;
  }

  sync(workspaceSlugs: string[]): void {
    const desired = new Set(workspaceSlugs);

    for (const [slug, watcher] of this.watchers) {
      if (!desired.has(slug)) {
        watcher.close();
        this.watchers.delete(slug);
      }
    }

    for (const slug of workspaceSlugs) {
      if (!this.watchers.has(slug)) {
        this.startWatching(slug);
      }
    }
  }

  waitForReady(slug: string): Promise<void> {
    const watcher = this.watchers.get(slug);
    if (!watcher) return Promise.resolve();
    return new Promise((resolve) => {
      watcher.on('ready', resolve);
    });
  }

  private startWatching(slug: string): void {
    const specsDir = path.join(this.engyDir, slug, 'specs');
    const watchOptions: ChokidarOptions = {
      ignoreInitial: true,
      depth: 10,
    };
    if (this.options.usePolling) {
      watchOptions.usePolling = true;
      watchOptions.interval = 100;
    }
    const watcher = watch(specsDir, watchOptions);

    watcher.on('all', (eventType: string, filePath: string) => {
      const mapped = mapEventType(eventType);
      if (!mapped) return;

      this.wsClient.send({
        type: 'FILE_CHANGE',
        payload: {
          workspaceSlug: slug,
          path: filePath,
          eventType: mapped,
        },
      });
    });

    this.watchers.set(slug, watcher);
  }

  async closeAll(): Promise<void> {
    const closes = Array.from(this.watchers.values()).map((w) => w.close());
    await Promise.all(closes);
    this.watchers.clear();
  }
}

function mapEventType(event: string): 'add' | 'change' | 'unlink' | null {
  switch (event) {
    case 'add':
      return 'add';
    case 'change':
      return 'change';
    case 'unlink':
      return 'unlink';
    default:
      return null;
  }
}
