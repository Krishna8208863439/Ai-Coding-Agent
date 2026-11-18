import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../app';

export interface AppErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || (req as unknown as { id?: string }).id;

  // Zod schema validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.flatten(),
        requestId,
      },
    });
    return;
  }

  // Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  // Prisma unique constraint or record not found
  const errorObj = err as Record<string, unknown>;
  if (errorObj?.code === 'P2002') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A resource with this identifier already exists',
        requestId,
      },
    });
    return;
  }

  if (errorObj?.code === 'P2025') {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Requested record was not found',
        requestId,
      },
    });
    return;
  }

  // Log unhandled server error
  logger.error({ err, requestId, path: req.path }, 'Unhandled server error');

  const message =
    err instanceof Error ? err.message : 'An unexpected internal error occurred';

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      requestId,
    },
  });
}
