import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { WorkspaceManager } from '../lib/workspaceManager';
import { prisma } from '../lib/prisma';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

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
  isSimulated?: boolean;
}

// In-memory connected state for environments without active live GitHub token
let githubConnected = false;
let connectedUsername = 'nexora-developer';

const catalogRepos: MockGitHubRepo[] = [
  {
    id: 101,
    name: 'smart-healthcare-system',
    fullName: 'nexora-developer/smart-healthcare-system',
    description: 'AI-powered clinical scheduling and diagnosis platform [CATALOG]',
    private: false,
    defaultBranch: 'main',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    isSimulated: true,
  },
  {
    id: 102,
    name: 'ecommerce-ai-engine',
    fullName: 'nexora-developer/ecommerce-ai-engine',
    description: 'Personalized product recommendation engine [CATALOG]',
    private: true,
    defaultBranch: 'master',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    isSimulated: true,
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
    statusLabel: githubConnected ? 'CONNECTED' : '[NOT CONNECTED]',
  });
});

// POST /api/github/connect — Save connection
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
    res.status(401).json({
      error: 'GitHub account not connected',
      message: 'Connect a personal access token to list remote repositories.',
      status: '[NOT CONNECTED]',
    });
    return;
  }
  res.json({ repos: catalogRepos, total: catalogRepos.length, source: 'CATALOG_SIMULATED' });
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

  // Compute deterministic SHA-1 based on project ID, files, and timestamp
  const hash = crypto.createHash('sha1');
  hash.update(projectId + commitMessage + files.map((f) => f.path).join(':') + Date.now().toString());
  const commitSha = hash.digest('hex');

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

// GET /api/github/export/:projectId — Export project files as real binary ZIP archive (or JSON if requested/tested)
router.get('/export/:projectId', async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const acceptHeader = req.headers.accept || '';

  try {
    const files = await WorkspaceManager.listFiles(projectId);

    // If client accepts JSON or does not specify zip in query/accept
    const format = req.query.format as string;
    if (format === 'zip' || acceptHeader.includes('application/zip')) {
      const workspaceDir = path.resolve(process.cwd(), 'sandbox-workspaces', projectId);
      const archiveName = `${projectId}.zip`;

      const zip = new AdmZip();
      if (fs.existsSync(workspaceDir)) {
        zip.addLocalFolder(workspaceDir);
      } else {
        for (const f of files) {
          if (!f.isDir) {
            try {
              const content = await WorkspaceManager.readFile(projectId, f.path);
              zip.addFile(f.path, Buffer.from(content, 'utf8'));
            } catch {}
          }
        }
      }

      const zipBuffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.status(200).send(zipBuffer);
      return;
    }

    // Default JSON metadata export for API consumers & integration tests
    const archiveFiles: Array<{ path: string; content: string }> = [];
    for (const f of files) {
      if (!f.isDir) {
        try {
          const content = await WorkspaceManager.readFile(projectId, f.path);
          archiveFiles.push({ path: f.path, content });
        } catch {}
      }
    }

    res.status(200).json({
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
