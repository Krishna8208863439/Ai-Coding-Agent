import crypto from 'crypto';

// Master key derived from environment or fallback in dev
const MASTER_KEY = Buffer.from(
  (process.env.NEXORA_MASTER_KEY || 'nexora-master-secret-key-32-b!').padEnd(32, '0').slice(0, 32),
  'utf-8'
);

const ALGORITHM = 'aes-256-gcm';

export interface EncryptedSecretPayload {
  encrypted: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export class ApiVault {
  private static currentKeyVersion = 1;

  static encrypt(secret: string): EncryptedSecretPayload {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag,
      keyVersion: this.currentKeyVersion,
    };
  }

  static decrypt(payload: { encrypted: string; iv: string; authTag: string }): string {
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static mask(secret?: string | null): string {
    if (!secret || secret.trim().length === 0) return 'None';
    const trimmed = secret.trim();
    if (trimmed.length <= 8) {
      return '••••••••';
    }
    const prefix = trimmed.slice(0, 3);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }
}
