import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { agentsRouter } from '../routes/agents';
import { AGENT_ROLES_CATALOG } from '@nexora/agents';

// Mock dependencies
vi.mock('../lib/prisma', () => {
  const store = {
    agentRuns: [] as any[],
    agentSteps: [] as any[],
    approvals: [] as any[],
    projects: [
      { id: 'proj-1', userId: 'user-123', name: 'Test Proj', template: 'react' },
      { id: 'proj-other', userId: 'other-user', name: 'Other Proj', template: 'react' },
    ],
  };

  return {
    prisma: {
      agentRun: {
        findMany: vi.fn(({ where }) => {
          return Promise.resolve(store.agentRuns.filter((r) => r.userId === where?.userId));
        }),
        findUnique: vi.fn(({ where }) => {
          return Promise.resolve(store.agentRuns.find((r) => r.id === where.id) || null);
        }),
        create: vi.fn(({ data }) => {
          const run = { id: `run-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), ...data };
          store.agentRuns.push(run);
          return Promise.resolve(run);
        }),
        update: vi.fn(({ where, data }) => {
          const idx = store.agentRuns.findIndex((r) => r.id === where.id);
          if (idx !== -1) {
            store.agentRuns[idx] = { ...store.agentRuns[idx], ...data, updatedAt: new Date() };
            return Promise.resolve(store.agentRuns[idx]);
          }
          return Promise.resolve(null);
        }),
      },
      agentStep: {
        create: vi.fn(({ data }) => {
          const step = { id: `step-${Date.now()}`, createdAt: new Date(), ...data };
          store.agentSteps.push(step);
          return Promise.resolve(step);
        }),
      },
      approval: {
        findUnique: vi.fn(({ where }) => {
          return Promise.resolve(store.approvals.find((a) => a.id === where.id) || null);
        }),
        findMany: vi.fn(({ where }) => {
          return Promise.resolve(store.approvals.filter((a) => a.userId === where?.userId && a.status === 'PENDING'));
        }),
        create: vi.fn(({ data }) => {
          const app = { id: `app-${Date.now()}`, createdAt: new Date(), ...data };
          store.approvals.push(app);
          return Promise.resolve(app);
        }),
        update: vi.fn(({ where, data }) => {
          const idx = store.approvals.findIndex((a) => a.id === where.id);
          if (idx !== -1) {
            store.approvals[idx] = { ...store.approvals[idx], ...data };
            return Promise.resolve(store.approvals[idx]);
          }
          return Promise.resolve(null);
        }),
      },
      project: {
        findUnique: vi.fn(({ where }) => {
          return Promise.resolve(store.projects.find((p) => p.id === where.id) || null);
        }),
      },
      _store: store,
    },
  };
});

// Mock requireAuth middleware
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { sub: 'user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock WorkspaceManager
vi.mock('../lib/workspaceManager', () => ({
  WorkspaceManager: {
    listFiles: vi.fn().mockResolvedValue([{ path: 'src/index.ts', isDir: false, size: 100 }]),
    readFile: vi.fn().mockResolvedValue('export const hello = "world";'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/agents', agentsRouter);

describe('Agents API Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/agents/roles returns all 7 specialized agent definitions', async () => {
    const res = await request(app).get('/api/agents/roles');
    expect(res.status).toBe(200);
    expect(res.body.roles).toBeDefined();
    expect(res.body.roles.length).toBe(7);

    const roleNames = res.body.roles.map((r: any) => r.role);
    expect(roleNames).toContain('ARCHITECT');
    expect(roleNames).toContain('DEVELOPER');
    expect(roleNames).toContain('TESTER');
    expect(roleNames).toContain('DEBUGGER');
    expect(roleNames).toContain('SECURITY');
    expect(roleNames).toContain('UI_UX');
    expect(roleNames).toContain('PROJECT_MANAGER');
  });

  it('GET /api/agents/runs returns user runs', async () => {
    const res = await request(app).get('/api/agents/runs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.runs)).toBe(true);
  });

  it('POST /api/agents/runs returns 422 if prompt is too short', async () => {
    const res = await request(app)
      .post('/api/agents/runs')
      .send({ projectId: 'proj-1', prompt: 'hi' });
    expect(res.status).toBe(422);
  });

  it('POST /api/agents/runs returns 404 if project not owned by user', async () => {
    const res = await request(app)
      .post('/api/agents/runs')
      .send({ projectId: 'proj-other', prompt: 'Build an authentication feature' });
    expect(res.status).toBe(404);
  });

  it('POST /api/agents/runs streams SSE events for a single agent run', async () => {
    const res = await request(app)
      .post('/api/agents/runs')
      .send({
        projectId: 'proj-1',
        prompt: 'Build user signup form with validation',
        agentRole: 'ARCHITECT',
        mode: 'single',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('run_start');
    expect(res.text).toContain('agent_switch');
    expect(res.text).toContain('ARCHITECT');
    expect(res.text).toContain('run_complete');
  });

  it('POST /api/agents/runs streams multi-agent sequence in autonomous mode', async () => {
    const res = await request(app)
      .post('/api/agents/runs')
      .send({
        projectId: 'proj-1',
        prompt: 'Implement end-to-end payment gateway',
        mode: 'autonomous',
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('ARCHITECT');
    expect(res.text).toContain('DEVELOPER');
    expect(res.text).toContain('TESTER');
    expect(res.text).toContain('SECURITY');
    expect(res.text).toContain('run_complete');
  });

  it('POST /api/agents/approvals/:id rejects invalid decisions', async () => {
    const res = await request(app)
      .post('/api/agents/approvals/app-1')
      .send({ decision: 'MAYBE' });
    expect(res.status).toBe(400);
  });

  it('GET /api/agents/approvals returns list of pending approvals', async () => {
    const res = await request(app).get('/api/agents/approvals');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.approvals)).toBe(true);
  });
});
