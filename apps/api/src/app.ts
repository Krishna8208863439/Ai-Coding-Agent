import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { SystemHealth } from '@nexora/shared';
import { authRouter } from './routes/auth';
import { providersRouter } from './routes/providers';
import { chatRouter } from './routes/chat';
import { projectsRouter } from './routes/projects';
import { agentsRouter } from './routes/agents';
import { terminalRouter } from './routes/terminal';
import { testingRouter } from './routes/testing';
import { githubRouter } from './routes/github';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const app: Express = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

const startTime = Date.now();

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const health: SystemHealth = {
    status: 'healthy',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
  res.status(200).json(health);
});

// Phase status
app.get('/api/phases', (_req: Request, res: Response) => {
  res.status(200).json({
    activePhase: 10,
    phaseName: 'GitHub, Export and Production',
    allPhases: [
      { phase: 1, name: 'Foundation and UI', status: 'COMPLETE' },
      { phase: 2, name: 'Authentication and Database', status: 'COMPLETE' },
      { phase: 3, name: 'API Manager and Model Library', status: 'COMPLETE' },
      { phase: 4, name: 'AI Chat and Streaming', status: 'COMPLETE' },
      { phase: 5, name: 'Project Generation', status: 'COMPLETE' },
      { phase: 6, name: 'Multi-Agent Orchestration', status: 'COMPLETE' },
      { phase: 7, name: 'Advanced IDE', status: 'COMPLETE' },
      { phase: 8, name: 'Sandbox and Execution', status: 'COMPLETE' },
      { phase: 9, name: 'Testing and Debugging', status: 'COMPLETE' },
      { phase: 10, name: 'GitHub, Export and Production', status: 'COMPLETE' },
    ],
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/providers', providersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/terminal', terminalRouter);
app.use('/api/testing', testingRouter);
app.use('/api/github', githubRouter);
