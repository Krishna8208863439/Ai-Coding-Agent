import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';

// Mock auth middleware
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { sub: 'usr-gh-test', userId: 'usr-gh-test', email: 'test@nexora.ai', role: 'USER' };
    next();
  },
}));

// Mock WorkspaceManager
vi.mock('../lib/workspaceManager', () => ({
  WorkspaceManager: {
    listFiles: vi.fn().mockResolvedValue([
      { path: 'package.json', isDir: false, size: 240 },
      { path: 'src/index.ts', isDir: false, size: 512 },
    ]),
    readFile: vi.fn().mockResolvedValue('{"name": "test-project"}'),
  },
}));

describe('GitHub & Export Routes — /api/github', () => {
  it('GET /api/github/status returns connection status', async () => {
    const res = await request(app).get('/api/github/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('scope');
  });

  it('POST /api/github/connect establishes connection', async () => {
    const res = await request(app)
      .post('/api/github/connect')
      .send({ token: 'ghp_mock_token_12345', username: 'nexora-developer' });

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.username).toBe('nexora-developer');
  });

  it('GET /api/github/repos lists available repositories when connected', async () => {
    const res = await request(app).get('/api/github/repos');
    expect(res.status).toBe(200);
    expect(res.body.repos).toBeInstanceOf(Array);
    expect(res.body.repos.length).toBeGreaterThan(0);
    expect(res.body.repos[0]).toHaveProperty('fullName');
  });

  it('POST /api/github/push commits and pushes to repository', async () => {
    const res = await request(app).post('/api/github/push').send({
      projectId: 'proj-demo-1',
      repoName: 'smart-healthcare-system',
      branch: 'main',
      commitMessage: 'feat: add healthcare patient dashboard',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('commitSha');
    expect(res.body.filesPushed).toBe(2);
    expect(res.body.url).toContain('smart-healthcare-system');
  });

  it('GET /api/github/export/:projectId packages project files', async () => {
    const res = await request(app).get('/api/github/export/proj-demo-1');
    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe('proj-demo-1');
    expect(res.body.files).toBeInstanceOf(Array);
    expect(res.body.totalFiles).toBeGreaterThan(0);
    expect(res.body.files[0]).toHaveProperty('path');
    expect(res.body.files[0]).toHaveProperty('content');
  });
});

