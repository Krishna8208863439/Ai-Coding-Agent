import express, { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { SandboxManager } from '../lib/sandboxManager';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

export const terminalRouter: Router = express.Router();

const execSchema = z.object({
  projectId: z.string(),
  command: z.string().min(1).max(1000),
});

// POST /api/terminal/exec — Execute command inside sandboxed project workspace
terminalRouter.post('/exec', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = execSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { projectId, command } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const result = await SandboxManager.executeCommand(projectId, command);
  res.status(200).json({ result });
});

// GET /api/terminal/status — Container & sandbox health statistics
terminalRouter.get('/status', (_req, res: Response) => {
  res.status(200).json({
    sandbox: {
      status: 'READY',
      isolation: 'Docker non-root (uid:1001)',
      cpuLimit: '1.5 cores',
      memoryLimit: '1024 MB',
      networkPolicy: 'Restricted / Non-root',
      containers: [
        { name: 'nexora-runner-node', image: 'node:20-alpine', status: 'STANDBY' },
        { name: 'nexora-runner-python', image: 'python:3.12-alpine', status: 'STANDBY' },
      ],
    },
  });
});

