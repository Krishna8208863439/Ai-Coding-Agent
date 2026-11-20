import express, { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { checkSystemRoot } from '../lib/workspaceSecurity';
import { workspaceWatcher } from '../lib/workspaceWatcher';

export const workspaceRouter: Router = express.Router();

const openWorkspaceSchema = z.object({
  path: z.string().min(1),
  confirmHome: z.boolean().optional().default(false),
});

// POST /api/workspace/open — Open folder from host PC
workspaceRouter.post('/open', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = openWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_PATH', message: 'Path is required' });
    return;
  }

  const { path: rawPath, confirmHome } = parsed.data;

  // 1. Resolve and check existence
  const resolvedPath = path.resolve(rawPath);
  if (!fs.existsSync(resolvedPath)) {
    res.status(404).json({ error: 'PATH_NOT_FOUND', message: `Folder does not exist: ${resolvedPath}` });
    return;
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    res.status(400).json({ error: 'NOT_A_DIRECTORY', message: `Path is not a directory: ${resolvedPath}` });
    return;
  }

  // 2. Check read permission
  try {
    fs.readdirSync(resolvedPath);
  } catch (err: any) {
    res.status(403).json({ error: 'PERMISSION_DENIED', message: `Cannot read directory: ${err.message}` });
    return;
  }

  // 3. Security checks for system roots
  const rootCheck = checkSystemRoot(resolvedPath, confirmHome);
  if (rootCheck.blocked) {
    res.status(403).json({
      error: rootCheck.isHomeDir ? 'HOME_DIR_CONFIRMATION_REQUIRED' : 'SYSTEM_ROOT_BLOCKED',
      message: rootCheck.reason,
    });
    return;
  }

  // 4. Resolve realpath (follow symlinks to prevent escapes)
  const realRoot = fs.realpathSync(resolvedPath);
  const folderName = path.basename(realRoot) || realRoot;
  const userId = req.user!.sub;

  // 5. Find existing project or create new one
  let project = await prisma.project.findFirst({
    where: {
      userId,
      rootPath: realRoot,
    },
  });

  if (project) {
    project = await prisma.project.update({
      where: { id: project.id },
      data: {
        lastOpenedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else {
    project = await prisma.project.create({
      data: {
        userId,
        name: folderName,
        template: 'custom',
        status: 'READY',
        workspaceDir: realRoot,
        kind: 'LOCAL_FOLDER',
        rootPath: realRoot,
        trusted: false, // requires user trust dialog
        lastOpenedAt: new Date(),
      },
    });
  }

  // 6. Record in recent_workspaces
  await prisma.recentWorkspace.upsert({
    where: {
      userId_path: {
        userId,
        path: realRoot,
      },
    },
    update: {
      name: folderName,
      lastOpenedAt: new Date(),
      trusted: project.trusted,
    },
    create: {
      userId,
      path: realRoot,
      name: folderName,
      trusted: project.trusted,
      lastOpenedAt: new Date(),
    },
  });

  // Keep at most 10 recent unpinned workspaces
  const unpinned = await prisma.recentWorkspace.findMany({
    where: { userId, isPinned: false },
    orderBy: { lastOpenedAt: 'desc' },
    skip: 10,
  });

  if (unpinned.length > 0) {
    await prisma.recentWorkspace.deleteMany({
      where: { id: { in: unpinned.map((u) => u.id) } },
    });
  }

  // 7. Start file watcher
  workspaceWatcher.watchRoot(realRoot);

  res.status(200).json({
    project,
    trusted: project.trusted,
    rootPath: realRoot,
    name: folderName,
  });
});

// POST /api/workspace/trust — Mark a workspace as trusted
workspaceRouter.post('/trust', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId, rootPath } = req.body;
  const userId = req.user!.sub;

  let project = null;
  if (projectId) {
    project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  } else if (rootPath) {
    const realRoot = fs.realpathSync(path.resolve(rootPath));
    project = await prisma.project.findFirst({ where: { rootPath: realRoot, userId } });
  }

  if (!project) {
    res.status(404).json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    return;
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { trusted: true },
  });

  if (project.rootPath) {
    await prisma.recentWorkspace.updateMany({
      where: { userId, path: project.rootPath },
      data: { trusted: true },
    });
  }

  res.status(200).json({ success: true, trusted: true, projectId: project.id });
});

// GET /api/workspace/recent — List recent workspaces (max 10)
workspaceRouter.get('/recent', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  const recents = await prisma.recentWorkspace.findMany({
    where: { userId },
    orderBy: [
      { isPinned: 'desc' },
      { lastOpenedAt: 'desc' },
    ],
    take: 10,
  });

  // Check if directories still exist on disk
  const enriched = recents.map((r) => ({
    ...r,
    exists: fs.existsSync(r.path),
  }));

  res.status(200).json({ recents: enriched });
});

// POST /api/workspace/recent/pin — Toggle pin on a recent folder
workspaceRouter.post('/recent/pin', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, isPinned } = req.body;
  const userId = req.user!.sub;

  const updated = await prisma.recentWorkspace.updateMany({
    where: { id, userId },
    data: { isPinned: !!isPinned },
  });

  res.status(200).json({ success: true, count: updated.count });
});

// DELETE /api/workspace/recent/:id — Remove from recent list
workspaceRouter.delete('/recent/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.sub;

  await prisma.recentWorkspace.deleteMany({
    where: { id, userId },
  });

  res.status(200).json({ success: true });
});
