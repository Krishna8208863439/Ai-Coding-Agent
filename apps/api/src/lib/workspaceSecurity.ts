import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SystemRootCheck {
  blocked: boolean;
  reason?: string;
  isHomeDir?: boolean;
}

/**
 * Checks if a requested path targets a forbidden system root or sensitive OS directory.
 */
export function checkSystemRoot(targetPath: string, confirmHome = false): SystemRootCheck {
  const normalized = path.resolve(targetPath);
  const homeDir = path.resolve(os.homedir());

  // Windows-specific checks
  if (process.platform === 'win32') {
    // Drive roots (e.g., C:\, C:, D:\)
    if (/^[a-zA-Z]:\\?$/i.test(normalized)) {
      return {
        blocked: true,
        reason: 'Opening entire drive root is prohibited for security and system stability.',
      };
    }

    const lower = normalized.toLowerCase();
    const systemRoots = [
      'c:\\windows',
      'c:\\program files',
      'c:\\program files (x86)',
      'c:\\programdata',
      'c:\\system volume information',
      'c:\\recovery',
      'c:\\users',
    ];

    for (const sys of systemRoots) {
      if (lower === sys || lower.startsWith(sys + '\\system32') || lower === 'c:\\windows\\system32') {
        return {
          blocked: true,
          reason: `Opening system directory "${normalized}" is prohibited.`,
        };
      }
    }
  } else {
    // POSIX checks
    if (normalized === '/' || normalized === '/etc' || normalized === '/usr' || normalized === '/bin' ||
        normalized === '/sbin' || normalized === '/var' || normalized === '/System' || normalized === '/boot' ||
        normalized === '/root') {
      return {
        blocked: true,
        reason: `Opening system root directory "${normalized}" is prohibited.`,
      };
    }
  }

  // Home directory check
  if (normalized.toLowerCase() === homeDir.toLowerCase()) {
    if (!confirmHome) {
      return {
        blocked: true,
        isHomeDir: true,
        reason: 'Opening your user home directory can expose private credentials. Please explicitly confirm to open.',
      };
    }
  }

  return { blocked: false };
}

/**
 * Ensures that the target path resolves strictly inside the workspace root.
 * Resolves symlinks using realpath to prevent path traversal or symlink escape attacks.
 */
export function assertWithinRoot(targetPath: string, rootPath: string): string {
  if (targetPath === undefined || targetPath === null || !rootPath) {
    throw new Error('Both target path and root path are required for security boundary check.');
  }

  let realRoot: string;
  try {
    realRoot = fs.realpathSync(path.resolve(rootPath));
  } catch (err: any) {
    throw new Error(`Invalid workspace root path: ${err.message}`);
  }

  const resolvedTarget = path.resolve(rootPath, targetPath);
  let realTarget: string;
  try {
    if (fs.existsSync(resolvedTarget)) {
      realTarget = fs.realpathSync(resolvedTarget);
    } else {
      // If file doesn't exist yet (for write/create), resolve its parent directory
      const parentDir = path.dirname(resolvedTarget);
      if (fs.existsSync(parentDir)) {
        const realParent = fs.realpathSync(parentDir);
        realTarget = path.join(realParent, path.basename(resolvedTarget));
      } else {
        realTarget = resolvedTarget;
      }
    }
  } catch {
    realTarget = resolvedTarget;
  }

  const sep = path.sep;
  const isInside = realTarget === realRoot || realTarget.startsWith(realRoot + sep);

  if (!isInside) {
    throw new Error(`Security Exception: Access outside workspace root is blocked (Path traversal / symlink escape attempt).`);
  }

  return realTarget;
}

/**
 * Detects whether a buffer contains binary data (checks first 8KB for null bytes).
 */
export function detectBinary(buffer: Buffer): boolean {
  const maxBytes = Math.min(buffer.length, 8192);
  for (let i = 0; i < maxBytes; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Detects CRLF vs LF line endings.
 */
export function detectLineEnding(content: string): 'CRLF' | 'LF' {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/[^\r]\n/g) || []).length;
  return crlfCount > lfCount ? 'CRLF' : 'LF';
}
