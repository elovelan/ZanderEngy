import { createServer } from 'node:http';
import next from 'next';
import { getAppState } from './src/server/trpc/context';
import { createWebSocketServer } from './src/server/ws/server';
import { attachMCP } from './src/server/mcp/index';
import { runMigrations } from './src/server/db/migrate';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  runMigrations();

  const state = getAppState();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = createWebSocketServer(state);

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
    // Non-/ws upgrades (e.g. Next.js HMR) fall through to Next.js
  });

  attachMCP(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
