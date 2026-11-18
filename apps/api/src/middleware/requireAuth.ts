import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/tokens';

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    // Explicit opt-in dev bypass: only if NEXORA_DEV_BYPASS_AUTH is specifically set to 'true' in non-production
    if (process.env.NODE_ENV !== 'production' && process.env.NEXORA_DEV_BYPASS_AUTH === 'true') {
      req.user = {
        sub: 'usr_dev_workspace',
        email: 'developer@nexora.local',
        role: 'ADMIN',
      };
      next();
      return;
    }
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Please log in or provide a valid Bearer token.',
      },
    });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    // If dev bypass is explicitly active, fallback gracefully
    if (process.env.NODE_ENV !== 'production' && process.env.NEXORA_DEV_BYPASS_AUTH === 'true') {
      req.user = {
        sub: 'usr_dev_workspace',
        email: 'developer@nexora.local',
        role: 'ADMIN',
      };
      next();
      return;
    }
    res.status(401).json({
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired access token',
      },
    });
  }
}
