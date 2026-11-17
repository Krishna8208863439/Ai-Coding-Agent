import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { SandboxManager } from '../lib/sandboxManager';

// Mock dependencies
vi.mock('../lib/prisma', () => {
  const store = {
    projects: [
      { id: 'proj-1', userId: 'usr_test123', name: 'Test Proj', template: 'react' },
      { id: 'proj-other', userId: 'other-user', name: 'Other Proj', template: 'react' },
    ],
  };

  return {
    prisma: {
      project: {
        findUnique: vi.fn(({ where }) => {
          return Promise.resolve(store.projects.find((p) => p.id === where.id) || null);
        }),
      },
    },
  };
});

// Mock Auth
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { sub: 'usr_test123', email: 'test@example.com' };
    next();
  },
}));

describe('Terminal & Process Runner API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/terminal/status returns container and sandbox health', async () => {
    const res = await request(app).get('/api/terminal/status');
    expect(res.status).toBe(200);
    expect(res.body.sandbox).toBeDefined();
    expect(res.body.sandbox.status).toBe('READY');
    expect(res.body.sandbox.containers.length).toBeGreaterThan(0);
  });

  it('POST /api/terminal/exec validates allowed commands', async () => {
    const res = await request(app)
      .post('/api/terminal/exec')
      .send({ projectId: 'proj-1', command: 'npm test' });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
    expect(res.body.result.command).toBe('npm test');
  });

  it('POST /api/terminal/exec blocks forbidden commands with exit code 126', async () => {
    const res = await request(app)
      .post('/api/terminal/exec')
      .send({ projectId: 'proj-1', command: 'rm -rf /' });

    expect(res.status).toBe(200);
    expect(res.body.result.exitCode).toBe(126);
    expect(res.body.result.stderr).toContain('Forbidden security token');
  });

  it('POST /api/terminal/process/start registers and launches live preview process', async () => {
    const res = await request(app)
      .post('/api/terminal/process/start')
      .send({ projectId: 'proj-1', command: 'npm run dev', port: 5173 });

    expect(res.status).toBe(201);
    expect(res.body.process).toBeDefined();
    expect(res.body.process.status).toBe('RUNNING');
    expect(res.body.process.port).toBe(5173);
    expect(res.body.process.previewUrl).toBe('http://localhost:5173');
  });

  it('GET /api/terminal/process/:projectId retrieves current running status', async () => {
    const res = await request(app).get('/api/terminal/process/proj-1');
    expect(res.status).toBe(200);
    expect(res.body.process).toBeDefined();
    expect(res.body.process.status).toBe('RUNNING');
  });

  it('POST /api/terminal/process/:projectId/stop terminates running process', async () => {
    const res = await request(app).post('/api/terminal/process/proj-1/stop');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
