import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../lib/cryptoVault';

describe('AES-256-GCM Credential Vault', () => {
  it('encrypts and decrypts API key accurately', () => {
    const rawKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
    const encrypted = encryptApiKey(rawKey);

    expect(encrypted.encrypted).toBeTruthy();
    expect(encrypted.iv).toHaveLength(32); // 16 bytes in hex
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes in hex

    const decrypted = decryptApiKey(encrypted.encrypted, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(rawKey);
  });

  it('masks API key revealing only prefix and last 4 chars', () => {
    expect(maskApiKey('sk-ant-api03-abcdef1234')).toBe('sk-...1234');
    expect(maskApiKey('short')).toBe('****');
  });
});
