import express, { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { WorkspaceManager } from '../lib/workspaceManager';
import { generateProjectFiles } from '../lib/projectTemplates';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

export const projectsRouter: Router = express.Router();

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  template: z.enum(['react', 'node', 'python', 'nextjs', 'java']).default('react'),
  prompt: z.string().min(5).max(10000),
});

// GET /api/projects — List user projects
projectsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.sub },
    include: {
      tasks: { orderBy: { order: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.status(200).json({ projects });
});

// POST /api/projects/generate — Autonomous Prompt-to-Project Generation Engine
projectsRouter.post('/generate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { name, description, template, prompt } = parsed.data;

  // 1. Create Project Record in PostgreSQL
  const project = await prisma.project.create({
    data: {
      userId: req.user!.sub,
      name,
      description: description || prompt.slice(0, 120),
      template,
      status: 'GENERATING',
      workspaceDir: '',
    },
  });

  const projectDir = await WorkspaceManager.ensureProjectDir(project.id);
  await prisma.project.update({
    where: { id: project.id },
    data: { workspaceDir: projectDir },
  });

  // 2. Generate Development Plan Tasks
  const taskTitles = [
    'Analyze requirements and design system architecture',
    'Generate project file tree and configuration files',
    'Implement core business logic and API endpoints',
    'Write README and environment templates',
    'Initialize workspace sandbox environment',
  ];

  for (let i = 0; i < taskTitles.length; i++) {
    await prisma.projectTask.create({
      data: {
        projectId: project.id,
        title: taskTitles[i],
        status: 'COMPLETED',
        order: i + 1,
      },
    });
  }

  // 3. Generate Real Source Code Files
  const templateFiles = generateProjectFiles(name, template, prompt);

  for (const file of templateFiles) {
    await WorkspaceManager.writeFile(project.id, file.path, file.content);
    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        path: file.path,
        size: Buffer.byteLength(file.content, 'utf8'),
        isDir: false,
      },
    });
  }

  // 4. Update status to READY
  const updatedProject = await prisma.project.update({
    where: { id: project.id },
    data: { status: 'READY' },
    include: {
      files: true,
      tasks: { orderBy: { order: 'asc' } },
    },
  });

  res.status(201).json({
    project: updatedProject,
    message: `Project ${name} generated successfully with ${templateFiles.length} source files.`,
  });
});

// GET /api/projects/:id/files — List files in project directory
projectsRouter.get('/:id/files', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
  });

  if (!project || project.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const files = await WorkspaceManager.listFiles(project.id);
  res.status(200).json({ files });
});

// POST /api/projects/:id/files/modify — Update file content
projectsRouter.post('/:id/files/modify', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { path: filePath, content } = req.body as { path: string; content: string };
  if (!filePath || content === undefined) {
    res.status(400).json({ error: 'path and content are required' });
    return;
  }

  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project || project.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  await WorkspaceManager.writeFile(project.id, filePath, content);

  await prisma.projectFile.upsert({
    where: {
      projectId_path: {
        projectId: project.id,
        path: filePath,
      },
    },
    update: {
      size: Buffer.byteLength(content, 'utf8'),
      updatedAt: new Date(),
    },
    create: {
      projectId: project.id,
      path: filePath,
      size: Buffer.byteLength(content, 'utf8'),
      isDir: false,
    },
  });

  res.status(200).json({ success: true, path: filePath });
});
projectsRouter.get('/:id/files/content', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
  });

  if (!project || project.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  try {
    const content = await WorkspaceManager.readFile(project.id, filePath);
    res.status(200).json({ path: filePath, content });
  } catch (err: unknown) {
    res.status(404).json({ error: (err as Error).message });
  }
});
