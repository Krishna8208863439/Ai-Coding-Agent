import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { SandboxManager, CommandExecutionResult } from '../lib/sandboxManager';
import { WorkspaceManager } from '../lib/workspaceManager';

const router: Router = express.Router();
router.use(requireAuth);

// In-memory store for test runs (replaces Prisma in mock/test environments)
interface MockTestCase {
  id: string;
  name: string;
  suite: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  errorMsg?: string;
  stackTrace?: string;
}

interface MockTestRun {
  id: string;
  projectId: string;
  userId: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  framework: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  createdAt: string;
  updatedAt: string;
  cases: MockTestCase[];
}

const testRunStore = new Map<string, MockTestRun>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const TriggerRunSchema = z.object({
  projectId: z.string().min(1),
  framework: z.enum(['vitest', 'pytest', 'jest', 'junit']).default('vitest'),
});

const DebugSchema = z.object({
  projectId: z.string().min(1),
  errorMsg: z.string().min(1),
  stackTrace: z.string().optional(),
});

// POST /api/testing/runs — trigger a test run
router.post('/runs', async (req: Request, res: Response): Promise<void> => {
  const parsed = TriggerRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { projectId, framework } = parsed.data;
  const userId = (req as Request & { user?: { userId: string } }).user?.userId || 'anonymous';

  const runId = generateId();
  const startedAt = Date.now();

  const run: MockTestRun = {
    id: runId,
    projectId,
    userId,
    status: 'RUNNING',
    framework,
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    stdout: '',
    stderr: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cases: [],
  };
  testRunStore.set(runId, run);

  // Determine command for framework
  const commandMap: Record<string, string> = {
    vitest: 'npm run test',
    jest: 'npm run test',
    pytest: 'python -m pytest --tb=short',
    junit: 'node --version',
  };
  const command = commandMap[framework] || 'npm run test';

  let executionResult: CommandExecutionResult;
  let cases: MockTestCase[] = [];

  try {
    executionResult = await SandboxManager.executeCommand(projectId, command, 60000);
    const durationMs = Date.now() - startedAt;

    // Parse test results from stdout
    cases = parseTestOutput(executionResult.stdout + executionResult.stderr, framework);
    const passed = cases.filter((c) => c.status === 'PASSED').length;
    const failed = cases.filter((c) => c.status === 'FAILED').length;
    const skipped = cases.filter((c) => c.status === 'SKIPPED').length;

    // If nothing parsed, synthesize a summary case
    if (cases.length === 0) {
      cases = [
        {
          id: generateId(),
          name: 'Suite execution',
          suite: framework,
          status: executionResult.exitCode === 0 ? 'PASSED' : 'FAILED',
          durationMs,
          errorMsg: executionResult.exitCode !== 0 ? executionResult.stderr.slice(0, 500) : undefined,
        },
      ];
    }

    const finalPassed = cases.filter((c) => c.status === 'PASSED').length;
    const finalFailed = cases.filter((c) => c.status === 'FAILED').length;
    const finalSkipped = cases.filter((c) => c.status === 'SKIPPED').length;

    const updated: MockTestRun = {
      ...run,
      status: finalFailed > 0 ? 'FAILED' : 'PASSED',
      totalTests: cases.length,
      passed: finalPassed,
      failed: finalFailed,
      skipped: finalSkipped,
      durationMs,
      stdout: executionResult.stdout.slice(0, 10000),
      stderr: executionResult.stderr.slice(0, 5000),
      updatedAt: new Date().toISOString(),
      cases,
    };
    testRunStore.set(runId, updated);

    res.status(201).json(updated);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const failed: MockTestRun = {
      ...run,
      status: 'ERROR',
      stderr: errorMsg,
      updatedAt: new Date().toISOString(),
    };
    testRunStore.set(runId, failed);
    res.status(201).json(failed);
  }
});

// GET /api/testing/runs — list runs for a project
router.get('/runs', (req: Request, res: Response): void => {
  const projectId = req.query.projectId as string | undefined;
  const userId = (req as Request & { user?: { userId: string } }).user?.userId || 'anonymous';

  let runs = Array.from(testRunStore.values());
  if (projectId) {
    runs = runs.filter((r) => r.projectId === projectId);
  } else {
    runs = runs.filter((r) => r.userId === userId);
  }

  runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ runs, total: runs.length });
});

// GET /api/testing/runs/:id — single run with cases
router.get('/runs/:id', (req: Request, res: Response): void => {
  const run = testRunStore.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Test run not found' });
    return;
  }
  res.json(run);
});

// DELETE /api/testing/runs/:id — remove a test run
router.delete('/runs/:id', (req: Request, res: Response): void => {
  const existed = testRunStore.delete(req.params.id);
  if (!existed) {
    res.status(404).json({ error: 'Test run not found' });
    return;
  }
  res.json({ deleted: true });
});

// POST /api/testing/debug — analyze error and return suggestion
router.post('/debug', (req: Request, res: Response): void => {
  const parsed = DebugSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { errorMsg, stackTrace } = parsed.data;

  // Pattern-based debug suggestions
  const suggestion = analyzeError(errorMsg, stackTrace);

  res.json({
    id: generateId(),
    errorMsg,
    stackTrace: stackTrace || null,
    suggestion,
    createdAt: new Date().toISOString(),
  });
});

// GET /api/testing/status — testing system status
router.get('/status', (_req: Request, res: Response): void => {
  res.json({
    status: 'operational',
    supportedFrameworks: ['vitest', 'pytest', 'jest', 'junit'],
    totalRuns: testRunStore.size,
    version: '0.9.0',
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTestOutput(output: string, framework: string): MockTestCase[] {
  const cases: MockTestCase[] = [];

  if (framework === 'vitest' || framework === 'jest') {
    // Match: ✓ test name (Nms) or ✗ test name
    const passPattern = /[✓✔]\s+(.+?)\s+\((\d+)ms\)/g;
    const failPattern = /[✗✘×]\s+(.+?)(?:\n|$)/g;
    const skipPattern = /[○⊘]\s+(.+?)(?:\n|$)/g;

    let m: RegExpExecArray | null;
    while ((m = passPattern.exec(output)) !== null) {
      cases.push({ id: generateId(), name: m[1].trim(), suite: framework, status: 'PASSED', durationMs: parseInt(m[2]) });
    }
    while ((m = failPattern.exec(output)) !== null) {
      cases.push({ id: generateId(), name: m[1].trim(), suite: framework, status: 'FAILED', durationMs: 0, errorMsg: 'Assertion failed' });
    }
    while ((m = skipPattern.exec(output)) !== null) {
      cases.push({ id: generateId(), name: m[1].trim(), suite: framework, status: 'SKIPPED', durationMs: 0 });
    }
  } else if (framework === 'pytest') {
    const passPattern = /PASSED\s+(.+?)(?:\s+-|$)/gm;
    const failPattern = /FAILED\s+(.+?)(?:\s+-|$)/gm;
    const skipPattern = /SKIPPED\s+\[.+?\]\s+(.+?)(?:\n|$)/gm;

    let m: RegExpExecArray | null;
    while ((m = passPattern.exec(output)) !== null) {
      cases.push({ id: generateId(), name: m[1].trim(), suite: 'pytest', status: 'PASSED', durationMs: 0 });
    }
    while ((m = failPattern.exec(output)) !== null) {
      cases.push({ id: generateId(), name: m[1].trim(), suite: 'pytest', status: 'FAILED', durationMs: 0 });
    }
    while ((m = skipPattern.exec(output)) !== null) {
      cases.push({ id: generateId(), name: m[1].trim(), suite: 'pytest', status: 'SKIPPED', durationMs: 0 });
    }
  }

  return cases;
}

function analyzeError(errorMsg: string, stackTrace?: string): string {
  const msg = (errorMsg + (stackTrace || '')).toLowerCase();

  if (msg.includes('cannot find module') || msg.includes('module not found')) {
    return 'Module not found — run `npm install` or `pip install -r requirements.txt` to restore dependencies.';
  }
  if (msg.includes('enoent') || msg.includes('no such file')) {
    return 'File not found — verify the file path exists in the project workspace. Check if the file was deleted or renamed.';
  }
  if (msg.includes('typeerror') && msg.includes('undefined')) {
    return 'TypeError: accessing property of undefined — add null/undefined guards before the property access or verify the variable is initialized.';
  }
  if (msg.includes('syntaxerror')) {
    return 'SyntaxError — check for missing brackets, semicolons, or invalid syntax at the indicated line.';
  }
  if (msg.includes('econnrefused') || msg.includes('econnreset')) {
    return 'Connection refused — ensure the server is running and the port is correct. Check CORS settings if calling from browser.';
  }
  if (msg.includes('unauthorized') || msg.includes('401')) {
    return 'Authentication error — ensure a valid JWT token is present in the Authorization header.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Timeout — the operation exceeded its time limit. Consider increasing the timeout or optimizing the slow operation.';
  }
  if (msg.includes('memory') || msg.includes('heap out of memory')) {
    return 'Out of memory — reduce dataset size, add streaming, or increase Node.js heap with --max-old-space-size=4096.';
  }
  if (msg.includes('assertion') || msg.includes('expect(') || msg.includes('assertionerror')) {
    return 'Assertion failed — the actual value did not match the expected value. Review the test expectation and the implementation logic.';
  }
  if (msg.includes('import') || msg.includes('esm') || msg.includes('require is not defined')) {
    return 'Module format mismatch — check that your tsconfig `module` and package.json `type` ("module" vs "commonjs") are consistent.';
  }

  return 'An unexpected error occurred. Review the stack trace for the failing line, add defensive checks, and confirm all dependencies are installed.';
}

export { router as testingRouter };

