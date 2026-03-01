import { createServer } from 'node:http';
import next from 'next';
import { getAppState } from './src/server/trpc/context';
import { attachWebSocket } from './src/server/ws/server';
import { attachMCP } from './src/server/mcp/index';
import { runMigrations } from './src/server/db/migrate';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  runMigrations();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const state = getAppState();

  attachWebSocket(server, state);
  attachMCP(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
