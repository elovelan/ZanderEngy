import 'dotenv/config';
import { WsClient } from './ws/client.js';

const SERVER_URL = process.env.ENGY_SERVER_URL ?? 'http://localhost:3000';

function main(): void {
  const wsClient = new WsClient({
    serverUrl: SERVER_URL,
  });

  wsClient.connect();

  const shutdown = () => {
    wsClient.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`Engy client connecting to ${SERVER_URL}`);
}

main();
