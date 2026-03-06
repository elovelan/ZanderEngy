import { WebSocketServer, type WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { AppState } from '../trpc/context';

function parseQueryParams(url: string): URLSearchParams {
  const idx = url.indexOf('?');
  return new URLSearchParams(idx >= 0 ? url.slice(idx + 1) : '');
}

// Lightweight sessionId extraction — avoids full JSON.parse on the hot path.
// Matches "sessionId":"<value>" in compact messages like { t: 'o', sessionId: '...', d: '...' }
const SESSION_ID_RE = /"sessionId"\s*:\s*"([^"]+)"/;

function extractSessionId(raw: string): string | null {
  const m = SESSION_ID_RE.exec(raw);
  return m ? m[1] : null;
}

/**
 * Browser → Server WebSocket for terminal connections.
 * Browser sends compact messages ({ t: 'i', sessionId, d } / { t: 'resize', ... }).
 * These are forwarded RAW to the daemon terminal relay — zero parse on the hot path.
 */
export function createTerminalWebSocketServer(state: AppState): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const params = parseQueryParams(req.url ?? '');
    const sessionId = params.get('sessionId');
    const workingDir = params.get('workingDir');
    const command = params.get('command') ?? undefined;
    const cols = parseInt(params.get('cols') ?? '80', 10);
    const rows = parseInt(params.get('rows') ?? '24', 10);
    const scopeType = params.get('scopeType') ?? 'workspace';
    const scopeLabel = params.get('scopeLabel') ?? '';

    if (!sessionId || !workingDir) {
      ws.close(1008, 'Missing sessionId or workingDir');
      return;
    }

    const oldWs = state.terminalSessions.get(sessionId);
    if (oldWs && oldWs.readyState === oldWs.OPEN) {
      oldWs.close(1001, 'Replaced by new connection');
    }
    const isReconnect = oldWs !== undefined;
    state.terminalSessions.set(sessionId, ws);

    const daemon = state.terminalDaemon;
    const daemonReady = daemon && daemon.readyState === daemon.OPEN;

    if (isReconnect) {
      if (daemonReady) {
        daemon.send(JSON.stringify({ t: 'reconnect', sessionId }));
      }
    } else if (daemonReady) {
      daemon.send(
        JSON.stringify({ t: 'spawn', sessionId, workingDir, command, cols, rows, scopeType, scopeLabel }),
      );
    } else {
      sendRaw(ws, JSON.stringify({ t: 'error', message: 'No daemon connected' }));
    }

    // Hot path: forward browser input raw to daemon terminal relay
    ws.on('message', (raw: Buffer | string) => {
      const td = state.terminalDaemon;
      if (td && td.readyState === td.OPEN) {
        // Forward raw — no parse, no serialize
        td.send(typeof raw === 'string' ? raw : raw.toString('utf-8'));
      }
    });

    ws.on('close', () => {
      if (state.terminalSessions.get(sessionId) === ws) {
        state.terminalSessions.delete(sessionId);
      }
    });
  });

  return wss;
}

/**
 * Daemon → Server terminal relay WebSocket.
 * Daemon sends compact messages ({ t: 'o', sessionId, d } / { t: 'exit', ... } / { t: 'reconnected', ... }).
 * Server extracts sessionId via regex and forwards raw to the correct browser WS.
 */
export function createTerminalRelayWebSocketServer(state: AppState): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    state.terminalDaemon = ws;

    // Hot path: forward daemon terminal output raw to browser
    ws.on('message', (raw: Buffer | string) => {
      const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
      const sessionId = extractSessionId(str);
      if (!sessionId) return;

      const browserWs = state.terminalSessions.get(sessionId);
      if (browserWs) sendRaw(browserWs, str);

      const isExit = str.includes('"t":"exit"') || str.includes('"t": "exit"');
      if (isExit) state.terminalSessions.delete(sessionId);
    });

    ws.on('close', () => {
      if (state.terminalDaemon === ws) {
        state.terminalDaemon = null;
      }
    });
  });

  return wss;
}

function sendRaw(ws: WebSocket, data: string): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(data);
  }
}
