import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { checkSystemRoot, assertWithinRoot, detectBinary, detectLineEnding } from '../lib/workspaceSecurity';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Phase 2: Open Folder & Workspace Security Suite', () => {
  const testDir = path.join(os.tmpdir(), `nexora_test_ws_${Date.now()}`);
  const authHeader = { Authorization: 'Bearer dev' };

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'sample.txt'), 'Hello NEXORA\r\nLine 2', 'utf8');
    fs.writeFileSync(path.join(testDir, 'binary.dat'), Buffer.from([0x00, 0x01, 0x02, 0x03]));
    fs.mkdirSync(path.join(testDir, 'subfolder'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'subfolder', 'nested.ts'), 'export const x = 1;\n', 'utf8');
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. Security Boundary & Path Traversal Jail', () => {
    it('blocks Windows drive roots and system directories', () => {
      const driveRoot = checkSystemRoot('C:\\');
      expect(driveRoot.blocked).toBe(true);

      const winDir = checkSystemRoot('C:\\Windows');
      expect(winDir.blocked).toBe(true);

      const progFiles = checkSystemRoot('C:\\Program Files');
      expect(progFiles.blocked).toBe(true);
    });

    it('requires confirmation for home directory', () => {
      const home = os.homedir();
      const check = checkSystemRoot(home, false);
      expect(check.blocked).toBe(true);
      expect(check.isHomeDir).toBe(true);

      const confirmedCheck = checkSystemRoot(home, true);
      expect(confirmedCheck.blocked).toBe(false);
    });

    it('blocks path traversal and symlink escapes outside root', () => {
      expect(() => {
        assertWithinRoot('../../../Windows/System32', testDir);
      }).toThrow(/Security Exception/);
    });

    it('allows valid subpaths inside root', () => {
      const resolved = assertWithinRoot('subfolder/nested.ts', testDir);
      expect(resolved).toContain('nested.ts');
    });

    it('correctly detects binary vs text files', () => {
      const binBuf = Buffer.from([0x68, 0x65, 0x00, 0x6c]);
      expect(detectBinary(binBuf)).toBe(true);

      const textBuf = Buffer.from('const message = "hello";');
      expect(detectBinary(textBuf)).toBe(false);
    });

    it('accurately identifies line endings', () => {
      expect(detectLineEnding('Line 1\r\nLine 2\r\n')).toBe('CRLF');
      expect(detectLineEnding('Line 1\nLine 2\n')).toBe('LF');
    });
  });

  describe('2. Workspace REST Endpoints', () => {
    it('refuses to open system root C:\\Windows with 403 SYSTEM_ROOT_BLOCKED', async () => {
      const res = await request(app)
        .post('/api/workspace/open')
        .set(authHeader)
        .send({ path: 'C:\\Windows' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('SYSTEM_ROOT_BLOCKED');
    });

    it('opens a valid local folder and returns workspace info', async () => {
      const res = await request(app)
        .post('/api/workspace/open')
        .set(authHeader)
        .send({ path: testDir });

      expect(res.status).toBe(200);
      expect(res.body.project).toBeDefined();
      expect(res.body.project.kind).toBe('LOCAL_FOLDER');
      expect(res.body.trusted).toBe(false); // first open is untrusted
    });

    it('records workspace in recent list', async () => {
      const res = await request(app)
        .get('/api/workspace/recent')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.recents).toBeInstanceOf(Array);
      const found = res.body.recents.find((r: any) => r.path === fs.realpathSync(testDir));
      expect(found).toBeDefined();
    });

    it('trusts a workspace upon user confirmation', async () => {
      const res = await request(app)
        .post('/api/workspace/trust')
        .set(authHeader)
        .send({ rootPath: testDir });

      expect(res.status).toBe(200);
      expect(res.body.trusted).toBe(true);
    });
  });

  describe('3. Filesystem Browsing & CRUD Endpoints', () => {
    it('lazy-loads directory tree with folders first', async () => {
      const res = await request(app)
        .get(`/api/fs/tree?root=${encodeURIComponent(testDir)}&path=`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.entries).toBeInstanceOf(Array);
      // Folders should come before files
      const firstEntry = res.body.entries[0];
      expect(firstEntry.isDir).toBe(true);
      expect(firstEntry.name).toBe('subfolder');
    });

    it('reads text file preserving content and CRLF line ending', async () => {
      const res = await request(app)
        .get(`/api/fs/read?root=${encodeURIComponent(testDir)}&path=sample.txt`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.content).toContain('Hello NEXORA');
      expect(res.body.lineEnding).toBe('CRLF');
      expect(res.body.binary).toBe(false);
    });

    it('detects binary file and refuses text rendering', async () => {
      const res = await request(app)
        .get(`/api/fs/read?root=${encodeURIComponent(testDir)}&path=binary.dat`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.binary).toBe(true);
      expect(res.body.readOnly).toBe(true);
    });

    it('performs atomic write to disk', async () => {
      const res = await request(app)
        .post('/api/fs/write')
        .set(authHeader)
        .send({
          root: testDir,
          path: 'atomic_test.txt',
          content: 'Atomic Write Verification 100%',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const onDisk = fs.readFileSync(path.join(testDir, 'atomic_test.txt'), 'utf8');
      expect(onDisk).toBe('Atomic Write Verification 100%');
    });

    it('refuses path traversal on file read with 403', async () => {
      const res = await request(app)
        .get(`/api/fs/read?root=${encodeURIComponent(testDir)}&path=../../something`)
        .set(authHeader);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Security Exception/);
    });

    it('returns real git status for repository', async () => {
      const repoDir = path.resolve(process.cwd(), '../..'); // Monorepo git root
      const res = await request(app)
        .get(`/api/git/branch?root=${encodeURIComponent(repoDir)}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.isRepo).toBe(true);
      expect(res.body.branch).toBe('main');
    });
  });
});
