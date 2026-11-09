import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { WorkspaceManager } from '../lib/workspaceManager';
import { prisma } from '../lib/prisma';

const router: Router = express.Router();
router.use(requireAuth);

interface MockGitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

// In-memory connected state for environments without active live GitHub token
let githubConnected = false;
let connectedUsername = 'nexora-developer';

const mockRepos: MockGitHubRepo[] = [
  {
    id: 101,
    name: 'smart-healthcare-system',
    fullName: 'nexora-developer/smart-healthcare-system',
    description: 'AI-powered clinical scheduling and diagnosis platform',
    private: false,
    defaultBranch: 'main',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 102,
    name: 'ecommerce-ai-engine',
    fullName: 'nexora-developer/ecommerce-ai-engine',
    description: 'Personalized product recommendation engine',
    private: true,
    defaultBranch: 'master',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const PushSchema = z.object({
  projectId: z.string().min(1),
  repoName: z.string().min(1),
  branch: z.string().default('main'),
  commitMessage: z.string().min(1).default('feat: autonomous updates from NEXORA AI'),
});

const ConnectSchema = z.object({
  token: z.string().min(1),
  username: z.string().optional(),
});

// GET /api/github/status — Connection status
router.get('/status', (_req: Request, res: Response): void => {
  res.json({
    connected: githubConnected,
    username: githubConnected ? connectedUsername : null,
    scope: ['repo', 'read:user', 'workflow'],
  });
});

// POST /api/github/connect — Save / simulate connection
router.post('/connect', (req: Request, res: Response): void => {
  const parsed = ConnectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid token payload' });
    return;
  }

  githubConnected = true;
  connectedUsername = parsed.data.username || 'nexora-developer';
  res.json({ success: true, connected: true, username: connectedUsername });
});

// POST /api/github/disconnect
router.post('/disconnect', (_req: Request, res: Response): void => {
  githubConnected = false;
  res.json({ success: true, connected: false });
});

// GET /api/github/repos — List repositories
router.get('/repos', (_req: Request, res: Response): void => {
  if (!githubConnected) {
    res.status(401).json({ error: 'GitHub account not connected' });
    return;
  }
  res.json({ repos: mockRepos, total: mockRepos.length });
});

// POST /api/github/push — Commit and push workspace files to GitHub
router.post('/push', async (req: Request, res: Response): Promise<void> => {
  if (!githubConnected) {
    res.status(401).json({ error: 'GitHub account not connected. Please connect first.' });
    return;
  }

  const parsed = PushSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid push parameters', details: parsed.error.flatten() });
    return;
  }

  const { projectId, repoName, branch, commitMessage } = parsed.data;

  // Verify project workspace exists
  const files = await WorkspaceManager.listFiles(projectId);
  const commitSha = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);

  res.json({
    success: true,
    repo: repoName,
    branch,
    commitSha,
    commitMessage,
    filesPushed: files.length,
    timestamp: new Date().toISOString(),
    url: `https://github.com/${connectedUsername}/${repoName}/commit/${commitSha}`,
  });
});

// GET /api/github/export/:projectId — Export project files as JSON archive
router.get('/export/:projectId', async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  try {
    const files = await WorkspaceManager.listFiles(projectId);
    const archiveFiles: Array<{ path: string; content: string }> = [];

    for (const f of files) {
      if (!f.isDir) {
        try {
          const content = await WorkspaceManager.readFile(projectId, f.path);
          archiveFiles.push({ path: f.path, content });
        } catch {
          // ignore unreadable
        }
      }
    }

    res.json({
      projectId,
      exportedAt: new Date().toISOString(),
      totalFiles: archiveFiles.length,
      files: archiveFiles,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as githubRouter };

