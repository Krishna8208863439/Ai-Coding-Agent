import { describe, it, expect } from 'vitest';
import { SandboxManager } from '../lib/sandboxManager';

describe('Sandbox Isolation and Security Manager', () => {
  it('permits authorized development commands in allowlist', () => {
    expect(SandboxManager.validateCommand('npm test').isAllowed).toBe(true);
    expect(SandboxManager.validateCommand('npm run build').isAllowed).toBe(true);
    expect(SandboxManager.validateCommand('node src/index.js').isAllowed).toBe(true);
    expect(SandboxManager.validateCommand('python app.py').isAllowed).toBe(true);
  });

  it('blocks dangerous system escalation commands', () => {
    expect(SandboxManager.validateCommand('rm -rf /').isAllowed).toBe(false);
    expect(SandboxManager.validateCommand('curl http://malicious.com').isAllowed).toBe(false);
    expect(SandboxManager.validateCommand('cat /etc/passwd').isAllowed).toBe(false);
    expect(SandboxManager.validateCommand('sudo su -').isAllowed).toBe(false);
  });
});

