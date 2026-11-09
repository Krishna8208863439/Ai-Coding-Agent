import express, { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  hashRefreshToken,
} from '../lib/tokens';
import { writeAuditLog } from '../lib/audit';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

export const authRouter: Router = express.Router();

// --- Rate limiters ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// --- Zod Schemas ---
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- Cookie config ---
const REFRESH_COOKIE = 'nexora_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// --- POST /api/auth/register ---
authRouter.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Don't leak whether email exists; use same response time
    await argon2.hash('dummy-to-prevent-timing-attack');
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'USER' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const { rawToken, tokenHash, expiresAt } = signRefreshToken(user.id);
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  await writeAuditLog('AUTH_REGISTER', req, user.id, { email });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  res.cookie(REFRESH_COOKIE, rawToken, cookieOptions);
  res.status(201).json({ user, accessToken });
});

// --- POST /api/auth/login ---
authRouter.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummysalt$dummyhash';
  const passwordMatch = user
    ? await argon2.verify(user.passwordHash, password).catch(() => false)
    : (await argon2.verify(dummyHash, password).catch(() => false), false);

  if (!user || !passwordMatch) {
    await writeAuditLog('AUTH_LOGIN_FAILED', req, undefined, { email });
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const { rawToken, tokenHash, expiresAt } = signRefreshToken(user.id);
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  await writeAuditLog('AUTH_LOGIN', req, user.id, { email });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  res.cookie(REFRESH_COOKIE, rawToken, cookieOptions);
  res.status(200).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
    accessToken,
  });
});

// --- POST /api/auth/refresh ---
authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token provided' });
    return;
  }

  const tokenHash = hashRefreshToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // Reuse detection: token already revoked => revoke all tokens for this user
  if (stored.revoked) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId },
      data: { revoked: true },
    });
    await writeAuditLog('AUTH_REFRESH_REUSE_DETECTED', req, stored.userId);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: 0 });
    res.status(401).json({ error: 'Refresh token reuse detected. All sessions revoked.' });
    return;
  }

  if (stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Refresh token expired' });
    return;
  }

  // Rotate: revoke old, issue new
  const { rawToken: newRaw, tokenHash: newHash, expiresAt } = signRefreshToken(stored.userId);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true, replacedBy: newHash },
    }),
    prisma.refreshToken.create({
      data: { userId: stored.userId, tokenHash: newHash, expiresAt },
    }),
  ]);

  await writeAuditLog('AUTH_REFRESH', req, stored.userId);

  const accessToken = signAccessToken({
    sub: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  });

  res.cookie(REFRESH_COOKIE, newRaw, cookieOptions);
  res.status(200).json({ accessToken });
});

// --- POST /api/auth/logout ---
authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  await writeAuditLog('AUTH_LOGOUT', req, req.user?.sub);

  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: 0 });
  res.status(200).json({ message: 'Logged out successfully' });
});

// --- GET /api/auth/me ---
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({ user });
});

