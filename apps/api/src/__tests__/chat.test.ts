import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';

// In-memory conversation store for testing
const mockConversations: any[] = [];
const mockMessages: any[] = [];

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    conversation: {
      findMany: vi.fn().mockImplementation(async () => mockConversations),
      findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
        return mockConversations.find((c) => c.id === where.id) || null;
      }),
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        const item = { id: `conv-${Date.now()}`, ...data, messages: [] };
        mockConversations.push(item);
        return item;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => {
        const item = mockConversations.find((c) => c.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      delete: vi.fn().mockImplementation(async ({ where }: any) => {
        const idx = mockConversations.findIndex((c) => c.id === where.id);
        if (idx !== -1) mockConversations.splice(idx, 1);
        return { id: where.id };
      }),
    },
    message: {
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        const item = { id: `msg-${Date.now()}`, ...data, createdAt: new Date() };
        mockMessages.push(item);
        return item;
      }),
      findMany: vi.fn().mockImplementation(async () => mockMessages),
      deleteMany: vi.fn().mockImplementation(async () => {
        mockMessages.length = 0;
        return { count: 0 };
      }),
    },
    providerConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock requireAuth
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { sub: 'usr-chat-test', email: 'architect@nexora.ai', role: 'USER' };
    next();
  },
}));

describe('AI Chat & Right-Side Panel API Routes', () => {
  let createdConversationId: string;

  it('GET /api/chat/conversations returns user conversations', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(200);
    expect(res.body.conversations).toBeInstanceOf(Array);
  });

  it('POST /api/chat/conversations creates a new conversation', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .send({
        title: 'Right-Side Agent Verification Thread',
        modelId: 'gemini-2.0-flash',
        provider: 'gemini',
      });

    expect(res.status).toBe(201);
    expect(res.body.conversation).toHaveProperty('id');
    expect(res.body.conversation.title).toBe('Right-Side Agent Verification Thread');
    createdConversationId = res.body.conversation.id;
  });

  it('GET /api/chat/conversations/:id returns conversation with messages', async () => {
    const res = await request(app).get(`/api/chat/conversations/${createdConversationId}`);
    expect(res.status).toBe(200);
    expect(res.body.conversation.id).toBe(createdConversationId);
  });

  it('PATCH /api/chat/conversations/:id renames the conversation', async () => {
    const res = await request(app)
      .patch(`/api/chat/conversations/${createdConversationId}`)
      .send({ title: 'Updated Architectural Thread' });

    expect(res.status).toBe(200);
    expect(res.body.conversation.title).toBe('Updated Architectural Thread');
  });

  it('POST /api/chat/conversations/:id/clear clears conversation messages', async () => {
    const res = await request(app).post(`/api/chat/conversations/${createdConversationId}/clear`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/chat/stream streams SSE events and delta tokens', async () => {
    const res = await request(app)
      .post('/api/chat/stream')
      .send({
        conversationId: createdConversationId,
        model: 'gemini-2.0-flash',
        provider: 'gemini',
        content: 'Design an automated database testing pipeline',
        agentRole: 'ARCHITECT',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data: ');
    expect(res.text).toContain('delta');
    expect(res.text).toContain('done');
  });

  it('DELETE /api/chat/conversations/:id deletes conversation', async () => {
    const res = await request(app).delete(`/api/chat/conversations/${createdConversationId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
