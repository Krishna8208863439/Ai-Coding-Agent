import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../app';
import { workspaceWatcher, FileChangeEvent } from './workspaceWatcher';
import path from 'path';

interface ClientMeta {
  ws: WebSocket;
  subscribedRoot?: string;
  isAlive: boolean;
}

export class NexoraWsServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ClientMeta>();

  public init(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      verifyClient: (info, done) => {
        const origin = info.origin || info.req.headers.origin;
        // Strict origin check per security rule
        const allowed = [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          process.env.CORS_ORIGIN,
        ].filter(Boolean);

        if (!origin || allowed.some((o) => o && origin.startsWith(o))) {
          done(true);
        } else {
          logger.warn({ origin }, 'Rejected WebSocket connection due to invalid origin');
          done(false, 403, 'Forbidden origin');
        }
      },
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const meta: ClientMeta = {
        ws,
        isAlive: true,
      };
      this.clients.add(meta);

      ws.on('pong', () => {
        meta.isAlive = true;
      });

      ws.on('message', (data: string) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe_workspace' && msg.root) {
            meta.subscribedRoot = path.resolve(msg.root);
            workspaceWatcher.watchRoot(meta.subscribedRoot);
            ws.send(JSON.stringify({ type: 'subscribed', root: meta.subscribedRoot }));
          } else if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(meta);
      });

      ws.on('error', (err) => {
        logger.warn({ err }, 'WebSocket client error');
        this.clients.delete(meta);
      });
    });

    // Subscribe to workspaceWatcher events and broadcast to interested clients
    workspaceWatcher.addListener((event: FileChangeEvent) => {
      this.broadcastFileChange(event);
    });

    // Heartbeat to clear dead sockets
    setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000);

    logger.info('Nexora WebSocket server initialized on /ws');
  }

  public broadcastFileChange(event: FileChangeEvent): void {
    const payload = JSON.stringify({
      type: 'file_change',
      changeType: event.type,
      path: event.path,
      isDir: event.isDir,
      root: event.root,
      timestamp: Date.now(),
    });

    const normalizedRoot = path.resolve(event.root);

    for (const client of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (!client.subscribedRoot || client.subscribedRoot === normalizedRoot)
      ) {
        client.ws.send(payload);
      }
    }
  }
}

export const nexoraWsServer = new NexoraWsServer();
