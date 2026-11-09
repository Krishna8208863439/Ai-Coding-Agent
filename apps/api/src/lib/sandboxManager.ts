import { spawn } from 'child_process';
import { WorkspaceManager } from './workspaceManager';

export interface CommandExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

// Strict Command Allowlist & Forbidden Tokens
const ALLOWED_COMMAND_PREFIXES = [
  'npm test',
  'npm run build',
  'npm run lint',
  'npm run dev',
  'node',
  'python',
  'python3',
  'pytest',
  'pip list',
  'ls',
  'dir',
  'echo',
  'cat',
  'pwd',
];

const FORBIDDEN_TOKENS = [
  'rm -rf /',
  ':(){ :|:& };:',
  'curl',
  'wget',
  'nc',
  'netcat',
  'ncat',
  'sudo',
  'su -',
  '/etc/shadow',
  '/etc/passwd',
  'chmod 777',
  'mkfs',
  'dd if=',
];

export class SandboxManager {
  static validateCommand(command: string): { isAllowed: boolean; reason?: string } {
    const trimmed = command.trim();

    for (const forbidden of FORBIDDEN_TOKENS) {
      if (trimmed.includes(forbidden)) {
        return { isAllowed: false, reason: `Forbidden security token detected: ${forbidden}` };
      }
    }

    const matchesPrefix = ALLOWED_COMMAND_PREFIXES.some(
      (prefix) => trimmed === prefix || trimmed.startsWith(prefix + ' ')
    );

    if (!matchesPrefix) {
      return {
        isAllowed: false,
        reason: `Command not in sandbox allowlist. Allowed prefixes: ${ALLOWED_COMMAND_PREFIXES.slice(0, 6).join(', ')}...`,
      };
    }

    return { isAllowed: true };
  }

  static async executeCommand(
    projectId: string,
    command: string,
    timeoutMs = 15000
  ): Promise<CommandExecutionResult> {
    const validation = this.validateCommand(command);
    if (!validation.isAllowed) {
      return {
        command,
        exitCode: 126,
        stdout: '',
        stderr: `[NEXORA Sandbox Security Violation]: ${validation.reason}`,
        durationMs: 0,
      };
    }

    const projectDir = WorkspaceManager.getProjectDir(projectId);
    const start = Date.now();

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/c', command] : ['-c', command];

      const child = spawn(shell, shellArgs, {
        cwd: projectDir,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          CI: 'true',
        },
        timeout: timeoutMs,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          command,
          exitCode: code ?? 0,
          stdout,
          stderr,
          durationMs: Date.now() - start,
        });
      });

      child.on('error', (err) => {
        resolve({
          command,
          exitCode: 1,
          stdout,
          stderr: err.message,
          durationMs: Date.now() - start,
        });
      });
    });
  }
}

