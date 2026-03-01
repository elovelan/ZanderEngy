import 'dotenv/config';
import path from 'node:path';
import os from 'node:os';
import { WsClient } from './ws/client.js';
import { SpecWatcher } from './watcher.js';

const SERVER_URL = process.env.ENGY_SERVER_URL ?? 'http://localhost:3000';
const ENGY_DIR = process.env.ENGY_DIR ?? path.join(os.homedir(), '.engy');

function main(): void {
  const wsClient = new WsClient({
    serverUrl: SERVER_URL,
    onWorkspacesSync: (msg) => {
      specWatcher.sync(msg.payload.workspaces.map((w) => w.slug));
    },
  });

  const specWatcher = new SpecWatcher(ENGY_DIR, wsClient);

  wsClient.connect();

  const shutdown = () => {
    specWatcher.closeAll().then(() => {
      wsClient.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`Engy client connecting to ${SERVER_URL}`);
}

main();
