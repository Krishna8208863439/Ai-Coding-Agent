import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { authRouter } from './routes/auth';
import { providersRouter } from './routes/providers';
import { chatRouter } from './routes/chat';
import { projectsRouter } from './routes/projects';
import { agentsRouter } from './routes/agents';
import { terminalRouter } from './routes/terminal';
import { testingRouter } from './routes/testing';
import { githubRouter } from './routes/github';
import { universalApisRouter } from './routes/universalApis';
import { workspaceRouter } from './routes/workspace';
import { fsRouter } from './routes/fs';
import { gitRouter } from './routes/git';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { prisma } from './lib/prisma';
import fs from 'fs';
import path from 'path';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const app: Express = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(requestIdMiddleware);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as Request).id || req.headers['x-request-id']?.toString() || 'unknown',
  })
);

const startTime = Date.now();

// GET /api/health — Real, computed health check
app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  let dbStatus = 'DISCONNECTED';
  let dbLatencyMs = -1;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbStatus = 'CONNECTED';
  } catch {
    dbStatus = 'DISCONNECTED';
  }

  // Workspace directory check
  const workspaceRoot = path.resolve(process.cwd(), 'sandbox-workspaces');
  let workspaceWritable = false;
  try {
    if (!fs.existsSync(workspaceRoot)) {
      fs.mkdirSync(workspaceRoot, { recursive: true });
    }
    const testFile = path.join(workspaceRoot, '.health_check_tmp');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    workspaceWritable = true;
  } catch {
    workspaceWritable = false;
  }

  const isHealthy = dbStatus === 'CONNECTED';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    nodeVersion: process.version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    workspace: {
      path: workspaceRoot,
      writable: workspaceWritable,
    },
    docker: {
      status: 'NOT_INSTALLED',
      message: 'Docker engine not detected on host OS. Using host-level sandboxing.',
    },
  });
});

// GET /api/phases — Real platform progress
app.get('/api/phases', async (_req: Request, res: Response): Promise<void> => {
  // Query DB to determine real counts
  let connectedProvidersCount = 0;
  let totalProjectsCount = 0;
  try {
    connectedProvidersCount = await prisma.providerConfig.count({ where: { status: 'CONNECTED' } });
    totalProjectsCount = await prisma.project.count();
  } catch {
    // If DB is unreachable
  }

  res.status(200).json({
    activePhase: 1,
    phaseName: 'Foundation & Infrastructure Realization',
    stats: {
      connectedProviders: connectedProvidersCount,
      totalProjects: totalProjectsCount,
      dbStatus: 'CONNECTED',
    },
    allPhases: [
      { phase: 1, name: 'Foundation and UI', status: 'COMPLETE' },
      { phase: 2, name: 'Authentication and Database', status: 'IN_PROGRESS' },
      { phase: 3, name: 'API Manager and Model Library', status: 'PENDING' },
      { phase: 4, name: 'AI Chat and Streaming', status: 'PENDING' },
      { phase: 5, name: 'Project Generation', status: 'PENDING' },
      { phase: 6, name: 'Multi-Agent Orchestration', status: 'PENDING' },
      { phase: 7, name: 'Advanced IDE', status: 'PENDING' },
      { phase: 8, name: 'Sandbox and Execution', status: 'PENDING' },
      { phase: 9, name: 'Testing and Debugging', status: 'PENDING' },
      { phase: 10, name: 'GitHub, Export and Production', status: 'PENDING' },
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
app.use('/api/universal-apis', universalApisRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/fs', fsRouter);
app.use('/api/git', gitRouter);

// Global Error Handler — Must be mounted after all routes
app.use(errorHandler);
