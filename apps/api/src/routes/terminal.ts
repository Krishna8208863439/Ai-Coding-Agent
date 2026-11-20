import express, { Router, Response } from 'express';
import { z } from 'zod';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { assertWithinRoot } from '../lib/workspaceSecurity';
import { WorkspaceManager } from '../lib/workspaceManager';
import { SandboxManager } from '../lib/sandboxManager';

export const terminalRouter: Router = express.Router();

const execSchema = z.object({
  projectId: z.string().optional(),
  root: z.string().optional(),
  command: z.string().min(1).max(2000),
  timeoutMs: z.number().int().min(1000).max(120000).optional().default(30000),
});

const startProcessSchema = z.object({
  projectId: z.string().optional(),
  root: z.string().optional(),
  command: z.string().min(1).max(1000).optional().default('npm run dev'),
  port: z.number().int().min(1024).max(65535).optional().default(3000),
});

// Running process record with live ChildProcess reference
interface ActiveProcessRecord {
  id: string;
  key: string;
  command: string;
  port: number;
  pid: number | undefined;
  child?: ChildProcess;
  status: 'STARTING' | 'RUNNING' | 'STOPPED' | 'ERROR';
  startedAt: Date;
  logs: string[];
}

const activeProcessMap = new Map<string, ActiveProcessRecord>();

// Helper to resolve working directory for terminal operations
async function resolveWorkingDir(
  root?: string,
  projectId?: string,
  userId?: string
): Promise<{ dir: string; isRestricted: boolean }> {
  if (root) {
    const resolved = assertWithinRoot('', root);
    let isRestricted = false;
    try {
      if (typeof prisma?.project?.findFirst === 'function') {
        const project = await prisma.project.findFirst({
          where: { rootPath: resolved },
        });
        isRestricted = project?.trusted === false;
      }
    } catch {}
    return { dir: resolved, isRestricted };
  }

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || (userId && project.userId !== userId)) {
      throw new Error('Project not found or access denied.');
    }

    if (project.kind === 'LOCAL_FOLDER' && project.rootPath) {
      return { dir: project.rootPath, isRestricted: project.trusted === false };
    }

    const dir = await WorkspaceManager.ensureProjectDir(projectId);
    return { dir, isRestricted: false };
  }

  throw new Error('Either workspace root or projectId must be provided.');
}

// ─── GET /api/terminal/status ─────────────────────────────────────────
// Sandbox health & resource metrics
terminalRouter.get('/status', (_req, res: Response) => {
  res.status(200).json({
    sandbox: {
      status: 'READY',
      isolation: 'Host Mode with Path Jail',
      activeProcesses: activeProcessMap.size,
      containers: [
        { name: 'nexora-runner-node', status: 'ACTIVE' },
      ],
    },
  });
});

// ─── POST /api/terminal/exec ──────────────────────────────────────────
// Execute command inside workspace folder with real stdout/stderr
terminalRouter.post('/exec', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = execSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { root, projectId, command, timeoutMs } = parsed.data;

  // Validate security allowlist & forbidden tokens
  const validation = SandboxManager.validateCommand(command);
  if (!validation.isAllowed) {
    res.status(200).json({
      result: {
        command,
        exitCode: 126,
        stdout: '',
        stderr: `[NEXORA Sandbox Security Violation]: ${validation.reason}`,
        durationMs: 0,
      },
    });
    return;
  }

  try {
    const { dir, isRestricted } = await resolveWorkingDir(root, projectId, req.user?.sub);

    if (isRestricted) {
      res.status(403).json({
        error: 'RESTRICTED_MODE',
        message: 'Terminal execution is blocked in Restricted Mode. Please trust this folder to run commands.',
      });
      return;
    }

    const start = Date.now();
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const child = spawn(shell, shellArgs, {
      cwd: dir,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        CI: 'true',
      },
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      res.status(200).json({
        result: {
          command,
          exitCode: code ?? 0,
          stdout,
          stderr,
          durationMs: Date.now() - start,
        },
      });
    });

    child.on('error', (err) => {
      res.status(200).json({
        result: {
          command,
          exitCode: 1,
          stdout,
          stderr: err.message,
          durationMs: Date.now() - start,
        },
      });
    });
  } catch (err: any) {
    res.status(err.message?.includes('Security') ? 403 : 500).json({
      error: 'EXEC_FAILED',
      message: err.message,
    });
  }
});

// ─── POST /api/terminal/process/start ─────────────────────────────────
// Start real background application process (e.g. dev server) for live preview & debugging
terminalRouter.post('/process/start', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = startProcessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { root, projectId, command, port } = parsed.data;

  try {
    const { dir, isRestricted } = await resolveWorkingDir(root, projectId, req.user?.sub);

    if (isRestricted) {
      res.status(403).json({
        error: 'RESTRICTED_MODE',
        message: 'Starting processes is blocked in Restricted Mode. Please trust this folder to run scripts.',
      });
      return;
    }

    const processKey = root ? `root-${path.resolve(root)}` : `proj-${projectId}`;

    // If already running, stop old one
    const existing = activeProcessMap.get(processKey);
    if (existing && existing.child) {
      try {
        existing.child.kill();
      } catch {}
    }

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const child = spawn(shell, shellArgs, {
      cwd: dir,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
      },
    });

    const newProc: ActiveProcessRecord = {
      id: `proc-${Date.now()}`,
      key: processKey,
      command,
      port,
      pid: child.pid,
      child,
      status: 'RUNNING',
      startedAt: new Date(),
      logs: [`[NEXORA Process Manager]: Started "${command}" (PID ${child.pid}) in ${dir}`],
    };

    child.stdout?.on('data', (d) => {
      const line = d.toString().trim();
      if (line) {
        newProc.logs.push(line);
        if (newProc.logs.length > 500) newProc.logs.shift();
      }
    });

    child.stderr?.on('data', (d) => {
      const line = d.toString().trim();
      if (line) {
        newProc.logs.push(`[stderr]: ${line}`);
        if (newProc.logs.length > 500) newProc.logs.shift();
      }
    });

    child.on('close', (code) => {
      newProc.status = code === 0 ? 'STOPPED' : 'ERROR';
      newProc.logs.push(`[Process exited with code ${code}]`);
    });

    activeProcessMap.set(processKey, newProc);

    res.status(201).json({
      process: {
        id: newProc.id,
        command: newProc.command,
        port: newProc.port,
        pid: newProc.pid,
        status: newProc.status,
        previewUrl: `http://localhost:${port}`,
        startedAt: newProc.startedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'PROCESS_START_FAILED', message: err.message });
  }
});

// ─── GET /api/terminal/process / GET /api/terminal/process/:projectId ───
// Get active process details and live logs
terminalRouter.get(['/process', '/process/:projectId'], requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string | undefined;
  const projectId = (req.params.projectId as string | undefined) || (req.query.projectId as string | undefined);

  const processKey = root ? `root-${path.resolve(root)}` : projectId ? `proj-${projectId}` : null;
  if (!processKey) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root or projectId required' });
    return;
  }

  const proc = activeProcessMap.get(processKey);
  if (!proc) {
    res.status(200).json({ process: null, status: 'IDLE' });
    return;
  }

  res.status(200).json({
    process: {
      id: proc.id,
      command: proc.command,
      port: proc.port,
      pid: proc.pid,
      status: proc.status,
      previewUrl: `http://localhost:${proc.port}`,
      logs: proc.logs,
      startedAt: proc.startedAt,
    },
  });
});

// ─── POST /api/terminal/process/stop / POST /api/terminal/process/:projectId/stop ──
// Stop active process
terminalRouter.post(['/process/stop', '/process/:projectId/stop'], requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.body?.root as string | undefined;
  const projectId = (req.params.projectId as string | undefined) || (req.body?.projectId as string | undefined);

  const processKey = root ? `root-${path.resolve(root)}` : projectId ? `proj-${projectId}` : null;

  if (!processKey) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root or projectId required' });
    return;
  }

  const proc = activeProcessMap.get(processKey);
  if (!proc) {
    res.status(200).json({ success: true, message: 'No process was running' });
    return;
  }

  if (proc.child) {
    try {
      proc.child.kill();
    } catch {}
  }

  proc.status = 'STOPPED';
  proc.logs.push('[Process manually terminated]');
  activeProcessMap.delete(processKey);

  res.status(200).json({ success: true, message: 'Process terminated.' });
});

// ─── GET /api/terminal/scripts ────────────────────────────────────────
// Detect launchable scripts in workspace (package.json, python, rust, make)
terminalRouter.get('/scripts', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    const resolvedRoot = assertWithinRoot('', root);
    const scripts: Record<string, string> = {};
    const runtimes: string[] = [];

    // 1. package.json
    const pkgPath = path.join(resolvedRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkgContent.scripts && typeof pkgContent.scripts === 'object') {
          Object.assign(scripts, pkgContent.scripts);
        }
        runtimes.push('Node.js');
      } catch {}
    }

    // 2. Python
    if (fs.existsSync(path.join(resolvedRoot, 'main.py')) || fs.existsSync(path.join(resolvedRoot, 'app.py'))) {
      runtimes.push('Python');
      if (fs.existsSync(path.join(resolvedRoot, 'main.py'))) {
        scripts['run:python'] = 'python main.py';
      }
      if (fs.existsSync(path.join(resolvedRoot, 'app.py'))) {
        scripts['run:flask/fastapi'] = 'python app.py';
      }
    }

    // 3. Makefile
    if (fs.existsSync(path.join(resolvedRoot, 'Makefile'))) {
      runtimes.push('Make');
      scripts['make'] = 'make';
    }

    // 4. Cargo.toml
    if (fs.existsSync(path.join(resolvedRoot, 'Cargo.toml'))) {
      runtimes.push('Rust');
      scripts['cargo:run'] = 'cargo run';
      scripts['cargo:test'] = 'cargo test';
    }

    res.status(200).json({
      hasScripts: Object.keys(scripts).length > 0,
      scripts,
      runtimes,
    });
  } catch (err: any) {
    res.status(err.message?.includes('Security') ? 403 : 500).json({
      error: 'SCRIPTS_READ_FAILED',
      message: err.message,
    });
  }
});
