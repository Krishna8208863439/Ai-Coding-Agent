import 'dotenv/config';
import { validateEnv } from './lib/env';

// Fail fast if required environment variables are missing or invalid
validateEnv();

import http from 'http';
import { app, logger } from './app';
import { nexoraWsServer } from './lib/wsServer';

const PORT = Number(process.env.PORT) || 4000;
const HOST = '127.0.0.1'; // Strictly bind to local loopback per security rule

const server = http.createServer(app);

// Initialize WebSocket server on /ws
nexoraWsServer.init(server);

server.listen(PORT, HOST, () => {
  logger.info(`NEXORA API running on http://${HOST}:${PORT} [${process.env.NODE_ENV}] (Node ${process.version})`);
});
