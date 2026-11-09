import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';

// Mock auth middleware to pass through with a test user
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@nexora.ai', role: 'USER' };
    next();
  },
}));

// Mock SandboxManager to return predictable test outputs
vi.mock('../lib/sandboxManager', () => {
  return {
    SandboxManager: {
      executeCommand: vi.fn().mockResolvedValue({
        command: 'npm run test',
        exitCode: 0,
        stdout: `
✓ suite > test-alpha (12ms)
✓ suite > test-beta (8ms)
✓ suite > test-gamma (21ms)
○ suite > test-delta-skipped
`,
        stderr: '',
        durationMs: 41,
      }),
      validateCommand: vi.fn().mockReturnValue({ isAllowed: true }),
    },
  };
});

describe('Testing Routes — /api/testing', () => {
  it('GET /api/testing/status returns operational status and supported frameworks', async () => {
    const res = await request(app).get('/api/testing/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('operational');
    expect(res.body.supportedFrameworks).toContain('vitest');
    expect(res.body.supportedFrameworks).toContain('pytest');
  });

  it('POST /api/testing/runs triggers a test run and parses test cases', async () => {
    const res = await request(app)
      .post('/api/testing/runs')
      .send({ projectId: 'proj-123', framework: 'vitest' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.projectId).toBe('proj-123');
    expect(res.body.status).toBe('PASSED');
    expect(res.body.totalTests).toBe(4);
    expect(res.body.passed).toBe(3);
    expect(res.body.skipped).toBe(1);
    expect(res.body.cases).toHaveLength(4);
  });

  it('GET /api/testing/runs lists executed test runs', async () => {
    const res = await request(app).get('/api/testing/runs?projectId=proj-123');
    expect(res.status).toBe(200);
    expect(res.body.runs).toBeInstanceOf(Array);
    expect(res.body.runs.length).toBeGreaterThan(0);
  });

  it('GET /api/testing/runs/:id retrieves a single run', async () => {
    const listRes = await request(app).get('/api/testing/runs');
    const firstRun = listRes.body.runs[0];

    const res = await request(app).get(`/api/testing/runs/${firstRun.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(firstRun.id);
  });

  it('POST /api/testing/debug analyzes an error and returns suggestions', async () => {
    const res = await request(app).post('/api/testing/debug').send({
      projectId: 'proj-123',
      errorMsg: 'Cannot find module "lodash"',
      stackTrace: 'Error: Cannot find module "lodash"\n at require (internal/modules/cjs/loader.js:985:19)',
    });

    expect(res.status).toBe(200);
    expect(res.body.suggestion).toContain('npm install');
  });

  it('POST /api/testing/debug gives TypeError suggestion', async () => {
    const res = await request(app).post('/api/testing/debug').send({
      projectId: 'proj-123',
      errorMsg: "TypeError: Cannot read property 'map' of undefined",
    });

    expect(res.status).toBe(200);
    expect(res.body.suggestion).toContain('null/undefined guards');
  });
});

