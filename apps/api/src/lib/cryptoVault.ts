import crypto from 'crypto';

// Master key derived from environment or 32-byte fallback in dev
const MASTER_KEY = Buffer.from(
  (process.env.NEXORA_MASTER_KEY || 'nexora-master-secret-key-32-b!').padEnd(32, '0').slice(0, 32),
  'utf-8'
);

const ALGORITHM = 'aes-256-gcm';

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  authTag: string;
}

export function encryptApiKey(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decryptApiKey(encrypted: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

