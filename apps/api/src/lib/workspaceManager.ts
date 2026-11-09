import path from 'path';
import fs from 'fs/promises';

const BASE_WORKSPACE_DIR = path.resolve(process.cwd(), 'sandbox-workspaces');

export class WorkspaceManager {
  static getBaseDir(): string {
    return BASE_WORKSPACE_DIR;
  }

  static getProjectDir(projectId: string): string {
    return path.join(BASE_WORKSPACE_DIR, projectId);
  }

  static async ensureProjectDir(projectId: string): Promise<string> {
    const dir = this.getProjectDir(projectId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  static sanitizePath(projectId: string, relativePath: string): string {
    const projectDir = this.getProjectDir(projectId);
    const resolvedPath = path.resolve(projectDir, relativePath);

    // Prevent path traversal attacks (e.g. ../../)
    if (!resolvedPath.startsWith(projectDir)) {
      throw new Error(`Security Violation: Path traversal detected outside workspace: ${relativePath}`);
    }

    return resolvedPath;
  }

  static async writeFile(projectId: string, relativePath: string, content: string): Promise<void> {
    const fullPath = this.sanitizePath(projectId, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  static async readFile(projectId: string, relativePath: string): Promise<string> {
    const fullPath = this.sanitizePath(projectId, relativePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  static async listFiles(projectId: string, currentRelPath = ''): Promise<Array<{ path: string; isDir: boolean; size: number }>> {
    const projectDir = this.getProjectDir(projectId);
    const targetDir = path.join(projectDir, currentRelPath);

    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const results: Array<{ path: string; isDir: boolean; size: number }> = [];

      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;

        const rel = path.join(currentRelPath, entry.name).replace(/\\/g, '/');
        const full = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
          results.push({ path: rel, isDir: true, size: 0 });
          const subs = await this.listFiles(projectId, rel);
          results.push(...subs);
        } else {
          const stats = await fs.stat(full);
          results.push({ path: rel, isDir: false, size: stats.size });
        }
      }

      return results;
    } catch {
      return [];
    }
  }
}
