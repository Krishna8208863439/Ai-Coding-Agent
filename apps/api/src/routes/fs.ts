import express, { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { openNativeFolderDialog } from '../lib/nativeDialog';
import { assertWithinRoot, detectBinary, detectLineEnding } from '../lib/workspaceSecurity';
import { execSync } from 'child_process';

export const fsRouter: Router = express.Router();

// POST /api/fs/native-dialog — Open host OS folder picker
fsRouter.post('/native-dialog', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await openNativeFolderDialog();

  if (result.error) {
    res.status(501).json({
      error: result.error,
      message: 'Native folder dialog is unavailable in this environment. Falling back to in-app browser.',
    });
    return;
  }

  if (result.cancelled) {
    res.status(200).json({ cancelled: true });
    return;
  }

  res.status(200).json({ path: result.path });
});

// GET /api/fs/browse — In-app folder browser (browses filesystem directories)
fsRouter.get('/browse', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestedPath = (req.query.path as string) || '';

  // If no path requested: return drive letters on Windows or root on Unix
  if (!requestedPath) {
    if (process.platform === 'win32') {
      try {
        const stdout = execSync('wmic logicaldisk get name', { encoding: 'utf8' });
        const drives = stdout
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => /^[a-zA-Z]:$/.test(line))
          .map((drive) => ({
            name: `${drive}\\`,
            path: `${drive}\\`,
            isDir: true,
            readable: true,
          }));

        res.status(200).json({ currentPath: '', entries: drives });
        return;
      } catch {
        res.status(200).json({
          currentPath: '',
          entries: [{ name: 'C:\\', path: 'C:\\', isDir: true, readable: true }],
        });
        return;
      }
    } else {
      res.status(200).json({
        currentPath: '',
        entries: [{ name: '/', path: '/', isDir: true, readable: true }],
      });
      return;
    }
  }

  const resolved = path.resolve(requestedPath);
  if (!fs.existsSync(resolved)) {
    res.status(404).json({ error: 'PATH_NOT_FOUND', message: `Path does not exist: ${resolved}` });
    return;
  }

  try {
    const dirEntries = fs.readdirSync(resolved, { withFileTypes: true });
    const entries = dirEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const full = path.join(resolved, entry.name);
        let readable = true;
        try {
          fs.accessSync(full, fs.constants.R_OK);
        } catch {
          readable = false;
        }

        return {
          name: entry.name,
          path: full,
          isDir: true,
          readable,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const parent = path.dirname(resolved);
    res.status(200).json({
      currentPath: resolved,
      parentPath: parent !== resolved ? parent : null,
      entries,
    });
  } catch (err: any) {
    res.status(403).json({ error: 'ACCESS_DENIED', message: err.message });
  }
});

const DEFAULT_IGNORED = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
]);

// GET /api/fs/tree — Lazy-loaded directory tree (loads one level at a time)
fsRouter.get('/tree', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;
  const relativeSubpath = (req.query.path as string) || '';

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Workspace root is required.' });
    return;
  }

  try {
    const targetDir = assertWithinRoot(relativeSubpath, root);

    if (!fs.existsSync(targetDir)) {
      res.status(404).json({ error: 'DIR_NOT_FOUND', message: `Directory not found: ${relativeSubpath}` });
      return;
    }

    const items = fs.readdirSync(targetDir, { withFileTypes: true });

    const entries = items.map((item) => {
      const fullPath = path.join(targetDir, item.name);
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
      const isDir = item.isDirectory();
      const isIgnored = DEFAULT_IGNORED.has(item.name);

      let size = 0;
      let readable = true;

      try {
        if (!isDir) {
          const stat = fs.statSync(fullPath);
          size = stat.size;
        }
      } catch {
        readable = false;
      }

      return {
        name: item.name,
        path: relPath,
        isDir,
        size,
        readable,
        ignored: isIgnored,
      };
    });

    // Sort folders first alphabetically, then files alphabetically
    entries.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({
      root,
      path: relativeSubpath,
      entries,
    });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'TREE_READ_ERROR',
      message: err.message,
    });
  }
});

// GET /api/fs/read — Read file with binary detection, size limits, and line endings
fsRouter.get('/read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;
  const filePath = req.query.path as string;

  if (!root || !filePath) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'Both root and path are required.' });
    return;
  }

  try {
    const resolved = assertWithinRoot(filePath, root);

    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'FILE_NOT_FOUND', message: `File not found: ${filePath}` });
      return;
    }

    const stat = fs.statSync(resolved);
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
    const isOverSize = stat.size > MAX_SIZE;

    // Read initial buffer to inspect
    const fd = fs.openSync(resolved, 'r');
    const headerBuf = Buffer.alloc(Math.min(stat.size, 8192));
    fs.readSync(fd, headerBuf, 0, headerBuf.length, 0);
    fs.closeSync(fd);

    const isBinary = detectBinary(headerBuf);

    if (isBinary) {
      res.status(200).json({
        path: filePath,
        binary: true,
        readOnly: true,
        size: stat.size,
        message: 'Binary file cannot be edited in Monaco editor.',
      });
      return;
    }

    // Read full file content
    const fullBuffer = fs.readFileSync(resolved);
    const content = fullBuffer.toString('utf8');
    const lineEnding = detectLineEnding(content);

    res.status(200).json({
      path: filePath,
      content,
      encoding: 'utf8',
      lineEnding,
      readOnly: isOverSize,
      binary: false,
      size: stat.size,
      warning: isOverSize ? 'File exceeds 5MB limit. Opened in read-only mode to prevent memory exhaustion.' : null,
    });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'READ_FAILED',
      message: err.message,
    });
  }
});

// POST /api/fs/write — Atomic file write with line endings preservation
fsRouter.post('/write', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, path: filePath, content } = req.body;

  if (!root || !filePath || content === undefined) {
    res.status(400).json({ error: 'INVALID_BODY', message: 'root, path and content are required' });
    return;
  }

  try {
    const targetFile = assertWithinRoot(filePath, root);
    const parentDir = path.dirname(targetFile);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Atomic write pattern: write to .nexora_tmp file then atomic rename
    const tmpFile = `${targetFile}.${Date.now()}.nexora_tmp`;
    fs.writeFileSync(tmpFile, content, 'utf8');
    fs.renameSync(tmpFile, targetFile);

    const stat = fs.statSync(targetFile);
    res.status(200).json({
      success: true,
      path: filePath,
      bytesWritten: stat.size,
    });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'WRITE_FAILED',
      message: err.message,
    });
  }
});

// POST /api/fs/create — Create file or directory
fsRouter.post('/create', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, path: targetPath, isDir } = req.body;

  if (!root || !targetPath) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root and path are required' });
    return;
  }

  try {
    const target = assertWithinRoot(targetPath, root);

    if (fs.existsSync(target)) {
      res.status(409).json({ error: 'ALREADY_EXISTS', message: 'File or directory already exists.' });
      return;
    }

    if (isDir) {
      fs.mkdirSync(target, { recursive: true });
    } else {
      const parentDir = path.dirname(target);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(target, '', 'utf8');
    }

    res.status(201).json({ success: true, path: targetPath, isDir: !!isDir });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'CREATE_FAILED',
      message: err.message,
    });
  }
});

// DELETE /api/fs/delete — Delete file or directory
fsRouter.delete('/delete', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, path: targetPath } = req.body;

  if (!root || !targetPath) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root and path are required' });
    return;
  }

  try {
    const target = assertWithinRoot(targetPath, root);

    // Refuse deleting workspace root itself!
    if (target === fs.realpathSync(path.resolve(root))) {
      res.status(400).json({ error: 'CANNOT_DELETE_ROOT', message: 'Deleting the workspace root is not allowed.' });
      return;
    }

    if (!fs.existsSync(target)) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'File or directory does not exist.' });
      return;
    }

    fs.rmSync(target, { recursive: true, force: true });
    res.status(200).json({ success: true, path: targetPath });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'DELETE_FAILED',
      message: err.message,
    });
  }
});

// POST /api/fs/rename — Rename or move file / directory
fsRouter.post('/rename', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, oldPath, newPath } = req.body;

  if (!root || !oldPath || !newPath) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root, oldPath and newPath are required.' });
    return;
  }

  try {
    const targetOld = assertWithinRoot(oldPath, root);
    const targetNew = assertWithinRoot(newPath, root);

    if (!fs.existsSync(targetOld)) {
      res.status(404).json({ error: 'SOURCE_NOT_FOUND', message: 'Source file does not exist.' });
      return;
    }

    if (fs.existsSync(targetNew)) {
      res.status(409).json({ error: 'TARGET_EXISTS', message: 'Destination already exists.' });
      return;
    }

    fs.renameSync(targetOld, targetNew);
    res.status(200).json({ success: true, oldPath, newPath });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'RENAME_FAILED',
      message: err.message,
    });
  }
});

interface SearchMatch {
  lineNumber: number;
  lineText: string;
  matchIndex: number;
  matchLength: number;
}

interface FileSearchResult {
  file: string;
  matches: SearchMatch[];
}

// Helper to escape regex literal strings
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST /api/fs/search — Search workspace files by query/regex
fsRouter.post('/search', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    root,
    query,
    isRegex = false,
    matchCase = false,
    matchWholeWord = false,
    include = '',
    exclude = '',
    maxResults = 500,
  } = req.body;

  if (!root || !query) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root and query are required.' });
    return;
  }

  try {
    const realRoot = assertWithinRoot('', root);

    // Build regex
    let regex: RegExp;
    let flags = 'g';
    if (!matchCase) flags += 'i';

    try {
      if (isRegex) {
        regex = new RegExp(query, flags);
      } else {
        let pattern = escapeRegex(query);
        if (matchWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        regex = new RegExp(pattern, flags);
      }
    } catch (regErr: any) {
      res.status(400).json({ error: 'INVALID_REGEX', message: regErr.message });
      return;
    }

    // Custom includes/excludes
    const customExcludes = exclude
      ? exclude.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const customIncludes = include
      ? include.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const results: FileSearchResult[] = [];
    let totalMatches = 0;

    // Recursive search walk
    function walk(dir: string, depth = 0) {
      if (depth > 15 || totalMatches >= maxResults) return;

      let items: fs.Dirent[];
      try {
        items = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const item of items) {
        if (totalMatches >= maxResults) break;

        const fullPath = path.join(dir, item.name);
        const relPath = path.relative(realRoot, fullPath).replace(/\\/g, '/');
        const lowerName = item.name.toLowerCase();

        // Check exclusions
        if (DEFAULT_IGNORED.has(item.name) || customExcludes.some((ex: string) => relPath.toLowerCase().includes(ex) || lowerName === ex)) {
          continue;
        }

        if (item.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (item.isFile()) {
          // Check includes
          if (customIncludes.length > 0) {
            const matchesInclude = customIncludes.some((inc: string) => {
              if (inc.startsWith('*.')) {
                return lowerName.endsWith(inc.slice(1));
              }
              return relPath.toLowerCase().includes(inc);
            });
            if (!matchesInclude) continue;
          }

          try {
            const stat = fs.statSync(fullPath);
            // Skip large files > 2MB
            if (stat.size > 2 * 1024 * 1024) continue;

            // Check binary header
            const fd = fs.openSync(fullPath, 'r');
            const header = Buffer.alloc(Math.min(stat.size, 512));
            fs.readSync(fd, header, 0, header.length, 0);
            fs.closeSync(fd);
            if (detectBinary(header)) continue;

            // Read text file line-by-line
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            const fileMatches: SearchMatch[] = [];

            for (let i = 0; i < lines.length; i++) {
              if (totalMatches >= maxResults) break;
              const line = lines[i];

              // Reset regex state
              regex.lastIndex = 0;
              let match: RegExpExecArray | null;

              while ((match = regex.exec(line)) !== null) {
                fileMatches.push({
                  lineNumber: i + 1,
                  lineText: line.slice(0, 300),
                  matchIndex: match.index,
                  matchLength: match[0].length,
                });
                totalMatches++;
                if (totalMatches >= maxResults || match[0].length === 0) break;
              }
            }

            if (fileMatches.length > 0) {
              results.push({
                file: relPath,
                matches: fileMatches,
              });
            }
          } catch {
            // Ignore unreadable individual files
          }
        }
      }
    }

    walk(realRoot);

    res.status(200).json({
      totalMatches,
      totalFiles: results.length,
      limitReached: totalMatches >= maxResults,
      results,
    });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'SEARCH_FAILED',
      message: err.message,
    });
  }
});

// POST /api/fs/replace — Replace text in files across workspace
fsRouter.post('/replace', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    root,
    query,
    replacement = '',
    isRegex = false,
    matchCase = false,
    matchWholeWord = false,
    files = [],
  } = req.body;

  if (!root || query === undefined) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'root and query are required.' });
    return;
  }

  try {
    const realRoot = assertWithinRoot('', root);

    let regex: RegExp;
    let flags = 'g';
    if (!matchCase) flags += 'i';

    try {
      if (isRegex) {
        regex = new RegExp(query, flags);
      } else {
        let pattern = escapeRegex(query);
        if (matchWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        regex = new RegExp(pattern, flags);
      }
    } catch (regErr: any) {
      res.status(400).json({ error: 'INVALID_REGEX', message: regErr.message });
      return;
    }

    let filesModified = 0;
    let totalReplacements = 0;

    for (const relFile of files) {
      try {
        const fullPath = assertWithinRoot(relFile, realRoot);
        if (!fs.existsSync(fullPath)) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        let count = 0;
        const newContent = content.replace(regex, (match) => {
          count++;
          return replacement;
        });

        if (count > 0) {
          // Atomic write
          const tmpFile = `${fullPath}.${Date.now()}.nexora_tmp`;
          fs.writeFileSync(tmpFile, newContent, 'utf8');
          fs.renameSync(tmpFile, fullPath);
          filesModified++;
          totalReplacements += count;
        }
      } catch {
        // Skip individual errors
      }
    }

    res.status(200).json({
      success: true,
      filesModified,
      totalReplacements,
    });
  } catch (err: any) {
    res.status(err.message.includes('Security Exception') ? 403 : 500).json({
      error: 'REPLACE_FAILED',
      message: err.message,
    });
  }
});
