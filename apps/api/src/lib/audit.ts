import { prisma } from './prisma';
import { Request } from 'express';
import { Prisma } from '@prisma/client';

export type AuditAction =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_REFRESH'
  | 'AUTH_REFRESH_REUSE_DETECTED'
  | 'AUTH_TOKEN_INVALID';

export async function writeAuditLog(
  action: AuditAction,
  req: Request,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: userId ?? null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
        details: (details as Prisma.InputJsonValue) ?? {},
      },
    });
  } catch {
    // Audit log failure must never crash the request
  }
}

