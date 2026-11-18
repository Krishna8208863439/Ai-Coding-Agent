import express, { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { decryptApiKey } from '../lib/cryptoVault';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { getProviderAdapter } from '@nexora/providers';
import { LLMProviderType } from '@nexora/shared';

export const chatRouter: Router = express.Router();

const chatMessageSchema = z.object({
  conversationId: z.string().optional(),
  model: z.string().default('gemini-2.0-flash'),
  provider: z.string().default('gemini'),
  content: z.string().min(1).max(50000),
  agentRole: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

const renameConversationSchema = z.object({
  title: z.string().min(1).max(100),
});

// GET /api/chat/conversations — List conversations for the logged in user
chatRouter.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: req.user!.sub },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.status(200).json({ conversations });
});

// POST /api/chat/conversations — Create a new conversation
chatRouter.post('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const title = (req.body.title as string) || 'New Conversation';
  const modelId = (req.body.modelId as string) || 'gemini-2.0-flash';
  const provider = (req.body.provider as string) || 'gemini';

  const conversation = await prisma.conversation.create({
    data: {
      userId: req.user!.sub,
      title,
      modelId,
      provider,
    },
  });

  res.status(201).json({ conversation });
});

// GET /api/chat/conversations/:id — Get a specific conversation with all messages
chatRouter.get('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation || conversation.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.status(200).json({ conversation });
});

// PATCH /api/chat/conversations/:id — Rename conversation
chatRouter.patch('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = renameConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const existing = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { title: parsed.data.title },
  });

  res.status(200).json({ conversation: updated });
});

// DELETE /api/chat/conversations/:id — Delete conversation
chatRouter.delete('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  await prisma.conversation.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, message: 'Conversation deleted.' });
});

// POST /api/chat/conversations/:id/clear — Clear messages in a conversation
chatRouter.post('/conversations/:id/clear', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  await prisma.message.deleteMany({ where: { conversationId: req.params.id } });
  res.status(200).json({ success: true, message: 'Conversation cleared.' });
});

// POST /api/chat/stream — Stream AI chat response with Server-Sent Events (SSE)
chatRouter.post('/stream', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = chatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { conversationId, model, provider, content, agentRole, attachments } = parsed.data;

  // Retrieve or create conversation
  let conv = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : null;

  if (!conv || conv.userId !== req.user!.sub) {
    conv = await prisma.conversation.create({
      data: {
        userId: req.user!.sub,
        title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
        modelId: model,
        provider,
      },
    });
  }

  // Format content with attachments if present
  let fullUserContent = content;
  if (attachments && attachments.length > 0) {
    fullUserContent += `\n\n[Context Attached: ${attachments.join(', ')}]`;
  }

  // Save incoming user message
  await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: 'user',
      content: fullUserContent,
      tokensUsed: Math.ceil(fullUserContent.length / 4),
    },
  });

  // Fetch recent messages for context
  const previousMessages = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  // Retrieve configured key for this provider
  const config = await prisma.providerConfig.findFirst({
    where: { userId: req.user!.sub, provider },
  });

  let apiKey = '';
  if (config?.encryptedApiKey && config?.iv && config?.authTag) {
    try {
      apiKey = decryptApiKey(config.encryptedApiKey, config.iv, config.authTag);
    } catch {
      // fallback without failing
    }
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial conversation reference
  res.write(`data: ${JSON.stringify({ conversationId: conv.id, type: 'start' })}\n\n`);

  // Emit agent activity if role is specified
  if (agentRole) {
    res.write(
      `data: ${JSON.stringify({
        type: 'activity',
        activity: {
          action: `Active role: ${agentRole}`,
          agent: agentRole,
          status: 'running',
        },
      })}\n\n`
    );
  }

  const adapter = getProviderAdapter(provider as LLMProviderType);
  let assistantResponse = '';

  try {
    if (adapter.streamChat && apiKey && config?.status === 'CONNECTED') {
      assistantResponse = await adapter.streamChat(
        previousMessages.map((m) => ({ role: m.role, content: m.content })),
        model,
        apiKey,
        config?.endpoint || undefined,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk, type: 'delta' })}\n\n`);
        }
      );
    } else {
      // Explicitly annotated simulated response when no connected provider credentials exist
      const rolePrefix = agentRole ? `**[${agentRole} Agent - SIMULATED]** ` : '**[SIMULATED RESPONSE]** ';
      const fallbackReply =
        `${rolePrefix}\n\n` +
        `> **[SIMULATED - NO CONNECTED PROVIDER KEY]**\n` +
        `> Provider: \`${provider}\` | Model: \`${model}\`\n\n` +
        `Analyzing request: "${content}".\n\n` +
        `\`\`\`typescript\n` +
        `// NEXORA AI Workspace Example\n` +
        `export function WorkspaceModule() {\n` +
        `  console.log("Connect a real provider in AI Providers to get live model reasoning.");\n` +
        `}\n` +
        `\`\`\``;

      const words = fallbackReply.split(' ');
      for (const w of words) {
        assistantResponse += w + ' ';
        res.write(`data: ${JSON.stringify({ chunk: w + ' ', type: 'delta' })}\n\n`);
      }
    }
  } catch (err: unknown) {
    const errorMsg = `\n[NEXORA Error]: ${err instanceof Error ? err.message : String(err)}`;
    assistantResponse += errorMsg;
    res.write(`data: ${JSON.stringify({ chunk: errorMsg, type: 'delta' })}\n\n`);
  }

  // Persist assistant message in database
  const assistantTokens = Math.ceil(assistantResponse.length / 4);
  const savedAssistantMsg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: 'assistant',
      content: assistantResponse,
      tokensUsed: assistantTokens,
    },
  });

  // End SSE stream
  res.write(
    `data: ${JSON.stringify({
      type: 'done',
      messageId: savedAssistantMsg.id,
      tokensUsed: assistantTokens,
    })}\n\n`
  );
  res.end();
});
