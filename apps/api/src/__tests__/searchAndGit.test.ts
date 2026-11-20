import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('Phase 4: Search & Git Source Control Suite', () => {
  const testDir = path.join(os.tmpdir(), `nexora_search_git_test_${Date.now()}`);
  const authHeader = { Authorization: 'Bearer dev' };

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });

    // Initialize real git repo in testDir
    execSync('git init', { cwd: testDir });
    execSync('git config user.name "Nexora Test"', { cwd: testDir });
    execSync('git config user.email "test@nexora.dev"', { cwd: testDir });

    // Create test files
    fs.writeFileSync(
      path.join(testDir, 'index.ts'),
      'import { log } from "./logger";\nconsole.log("Hello NEXORA Search");\nconst count = 42;\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(testDir, 'logger.ts'),
      'export function log(msg: string) {\n  console.log("[LOG]", msg);\n}\n',
      'utf8'
    );
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'src', 'utils.ts'),
      '// utils file\nexport const add = (a: number, b: number) => a + b;\n',
      'utf8'
    );

    // Initial commit
    execSync('git add .', { cwd: testDir });
    execSync('git commit -m "initial commit"', { cwd: testDir });

    // Now make a modification to create real git diff and unstaged change
    fs.appendFileSync(path.join(testDir, 'index.ts'), '// modified line for diff\n', 'utf8');

    // Create an untracked file
    fs.writeFileSync(path.join(testDir, 'untracked.txt'), 'new untracked file content\n', 'utf8');
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. File Search API (POST /api/fs/search)', () => {
    it('searches workspace for literal query', async () => {
      const res = await request(app)
        .post('/api/fs/search')
        .set(authHeader)
        .send({
          root: testDir,
          query: 'console.log',
        });

      expect(res.status).toBe(200);
      expect(res.body.totalMatches).toBeGreaterThanOrEqual(2);
      expect(res.body.results.length).toBeGreaterThanOrEqual(2);
      expect(res.body.results[0]).toHaveProperty('file');
      expect(res.body.results[0].matches[0]).toHaveProperty('lineNumber');
      expect(res.body.results[0].matches[0]).toHaveProperty('lineText');
    });

    it('supports case sensitivity and whole word matching', async () => {
      // Case sensitive search for lowercase "nexora" should yield 0 matches (it is "NEXORA")
      const caseSensitive = await request(app)
        .post('/api/fs/search')
        .set(authHeader)
        .send({
          root: testDir,
          query: 'nexora',
          matchCase: true,
        });

      expect(caseSensitive.status).toBe(200);
      expect(caseSensitive.body.totalMatches).toBe(0);

      // Whole word matching for "log"
      const wholeWord = await request(app)
        .post('/api/fs/search')
        .set(authHeader)
        .send({
          root: testDir,
          query: 'log',
          matchWholeWord: true,
        });

      expect(wholeWord.status).toBe(200);
      expect(wholeWord.body.totalMatches).toBeGreaterThan(0);
    });

    it('supports regex search queries', async () => {
      const res = await request(app)
        .post('/api/fs/search')
        .set(authHeader)
        .send({
          root: testDir,
          query: 'count\\s*=\\s*\\d+',
          isRegex: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.totalMatches).toBe(1);
      expect(res.body.results[0].matches[0].lineText).toContain('count = 42');
    });

    it('respects file include and exclude filters', async () => {
      const res = await request(app)
        .post('/api/fs/search')
        .set(authHeader)
        .send({
          root: testDir,
          query: 'export',
          include: '*.ts',
          exclude: 'src',
        });

      expect(res.status).toBe(200);
      // Only logger.ts should match (src/utils.ts is excluded)
      const files = res.body.results.map((r: any) => r.file);
      expect(files).toContain('logger.ts');
      expect(files).not.toContain('src/utils.ts');
    });
  });

  describe('2. Workspace Replace API (POST /api/fs/replace)', () => {
    it('replaces query occurrences across files', async () => {
      const res = await request(app)
        .post('/api/fs/replace')
        .set(authHeader)
        .send({
          root: testDir,
          query: 'NEXORA Search',
          replacement: 'NEXORA SuperSearch',
          files: ['index.ts'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.filesModified).toBe(1);

      // Verify file on disk
      const content = fs.readFileSync(path.join(testDir, 'index.ts'), 'utf8');
      expect(content).toContain('Hello NEXORA SuperSearch');
    });
  });

  describe('3. Git Source Control API', () => {
    it('GET /api/git/branch returns real branch', async () => {
      const res = await request(app)
        .get(`/api/git/branch?root=${encodeURIComponent(testDir)}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.isRepo).toBe(true);
      expect(res.body.branch).toBeDefined();
    });

    it('GET /api/git/status detects modified and untracked files', async () => {
      const res = await request(app)
        .get(`/api/git/status?root=${encodeURIComponent(testDir)}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.isRepo).toBe(true);
      expect(res.body.modified).toContain('index.ts');
      expect(res.body.not_added).toContain('untracked.txt');
    });

    it('GET /api/git/diff returns unified diff and file contents for DiffEditor', async () => {
      const res = await request(app)
        .get(`/api/git/diff?root=${encodeURIComponent(testDir)}&path=index.ts`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.path).toBe('index.ts');
      expect(res.body.original).toBeDefined();
      expect(res.body.modified).toContain('modified line for diff');
      expect(res.body.diffText).toContain('+// modified line for diff');
    });

    it('POST /api/git/stage stages specific file and unstage unstages it', async () => {
      // Stage untracked.txt
      const stageRes = await request(app)
        .post('/api/git/stage')
        .set(authHeader)
        .send({ root: testDir, paths: ['untracked.txt'] });

      expect(stageRes.status).toBe(200);

      // Check status -> untracked.txt should now be in staged (created)
      const statusAfterStage = await request(app)
        .get(`/api/git/status?root=${encodeURIComponent(testDir)}`)
        .set(authHeader);

      expect(statusAfterStage.body.staged).toContain('untracked.txt');

      // Unstage untracked.txt
      const unstageRes = await request(app)
        .post('/api/git/unstage')
        .set(authHeader)
        .send({ root: testDir, paths: ['untracked.txt'] });

      expect(unstageRes.status).toBe(200);

      // Check status -> untracked.txt should no longer be staged
      const statusAfterUnstage = await request(app)
        .get(`/api/git/status?root=${encodeURIComponent(testDir)}`)
        .set(authHeader);

      expect(statusAfterUnstage.body.staged).not.toContain('untracked.txt');
    });

    it('POST /api/git/commit commits staged changes', async () => {
      // Stage index.ts
      await request(app)
        .post('/api/git/stage')
        .set(authHeader)
        .send({ root: testDir, paths: ['index.ts'] });

      // Commit
      const commitRes = await request(app)
        .post('/api/git/commit')
        .set(authHeader)
        .send({ root: testDir, message: 'test commit from suite' });

      expect(commitRes.status).toBe(200);
      expect(commitRes.body.success).toBe(true);

      // Status should now show index.ts is clean
      const status = await request(app)
        .get(`/api/git/status?root=${encodeURIComponent(testDir)}`)
        .set(authHeader);

      expect(status.body.modified).not.toContain('index.ts');
    });

    it('GET /api/git/remotes returns configured remotes list', async () => {
      const res = await request(app)
        .get(`/api/git/remotes?root=${encodeURIComponent(testDir)}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.remotes)).toBe(true);
    });
  });
});
