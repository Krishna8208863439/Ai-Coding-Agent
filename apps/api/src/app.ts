import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { SystemHealth } from '@nexora/shared';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(pinoHttp({ logger }));

const startTime = Date.now();

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const health: SystemHealth = {
    status: 'healthy',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
  res.status(200).json(health);
});

// Phase status endpoint
app.get('/api/phases', (_req: Request, res: Response) => {
  res.status(200).json({
    activePhase: 1,
    phaseName: 'Foundation and UI Architecture',
    allPhases: [
      { phase: 1, name: 'Foundation and UI', status: 'ACTIVE' },
      { phase: 2, name: 'Authentication and Database', status: 'LOCKED' },
      { phase: 3, name: 'API Manager and Model Library', status: 'LOCKED' },
      { phase: 4, name: 'AI Chat and Streaming', status: 'LOCKED' },
      { phase: 5, name: 'Project Generation', status: 'LOCKED' },
      { phase: 6, name: 'Multi-Agent Orchestration', status: 'LOCKED' },
      { phase: 7, name: 'Advanced IDE', status: 'LOCKED' },
      { phase: 8, name: 'Sandbox and Execution', status: 'LOCKED' },
      { phase: 9, name: 'Testing and Debugging', status: 'LOCKED' },
      { phase: 10, name: 'GitHub, Export and Production', status: 'LOCKED' },
    ],
  });
});
