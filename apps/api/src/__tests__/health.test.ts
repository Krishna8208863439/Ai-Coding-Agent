import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';

// ---- Mock Prisma & argon2 so tests run without a live DB ----
vi.mock('../lib/prisma', () => {
  const store: {
    users: Record<string, any>;
    tokens: Record<string, any>;
    audits: any[];
  } = { users: {}, tokens: {}, audits: [] };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) return Promise.resolve(store.users[where.email] ?? null);
          if (where.id) {
            const u = Object.values(store.users).find((u: unknown) => (u as Record<string, unknown>).id === where.id);
            return Promise.resolve(u ?? null);
          }
          return Promise.resolve(null);
        }),
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          const id = (data.id as string) || 'usr_' + Math.random().toString(36).substring(2, 9);
          const user = { ...data, id, createdAt: new Date().toISOString() };
          store.users[data.email as string] = user;
          return Promise.resolve(user);
        }),
      },
      refreshToken: {
        findUnique: vi.fn(({ where }: { where: { tokenHash: string } }) =>
          Promise.resolve((store.tokens[where.tokenHash] as unknown) ?? null)
        ),
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          store.tokens[data.tokenHash as string] = { ...data, id: 'tok-' + Math.random(), revoked: false };
          return Promise.resolve(store.tokens[data.tokenHash as string]);
        }),
        update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const tok = Object.values(store.tokens).find((t: unknown) => (t as Record<string, unknown>).id === where.id) as Record<string, unknown> | undefined;
          if (tok) Object.assign(tok, data);
          return Promise.resolve(tok);
        }),
        updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
      },
      auditLog: {
        create: vi.fn(() => Promise.resolve({})),
      },
      $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    },
  };
});

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn((val: string) => Promise.resolve('$argon2id$hashed:' + val)),
    verify: vi.fn((hash: string, val: string) =>
      Promise.resolve(hash === '$argon2id$hashed:' + val)
    ),
    argon2id: 2,
  },
  hash: vi.fn((val: string) => Promise.resolve('$argon2id$hashed:' + val)),
  verify: vi.fn((hash: string, val: string) =>
    Promise.resolve(hash === '$argon2id$hashed:' + val)
  ),
  argon2id: 2,
}));

// ---- Tests ----

describe('POST /api/auth/register', () => {
  it('registers a new user and returns 201 with accessToken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Test',
      email: 'alice@nexora.test',
      password: 'SecureP@ss123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@nexora.test');
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rejects duplicate email with 409', async () => {
    const payload = { name: 'Bob', email: 'bob@nexora.test', password: 'SecureP@ss123' };
    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(409);
  });

  it('rejects short password with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Charlie',
      email: 'charlie@nexora.test',
      password: 'short',
    });
    expect(res.status).toBe(422);
  });

  it('rejects invalid email with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dan',
      email: 'not-an-email',
      password: 'SecureP@ss123',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Eve Login',
      email: 'eve@nexora.test',
      password: 'SecureP@ss123',
    });
  });

  it('logs in successfully and returns 200 with accessToken', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'eve@nexora.test',
      password: 'SecureP@ss123',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe('eve@nexora.test');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'eve@nexora.test',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'unknown@nexora.test',
      password: 'SecureP@ss123',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Frank Me',
      email: 'frank@nexora.test',
      password: 'SecureP@ss123',
    });
    const { accessToken } = reg.body;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('frank@nexora.test');
  });
});

describe('POST /api/auth/logout', () => {
  it('requires auth and returns 200 when logged out', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Grace Logout',
      email: 'grace@nexora.test',
      password: 'SecureP@ss123',
    });
    const { accessToken } = reg.body;
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});
