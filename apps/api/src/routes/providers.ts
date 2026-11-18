import express, { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../lib/cryptoVault';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { getProviderAdapter, FALLBACK_MODELS } from '@nexora/providers';
import { LLMProviderType, ModelInfo } from '@nexora/shared';

export const providersRouter: Router = express.Router();

const providerSchema = z.object({
  provider: z.enum([
    'openai',
    'gemini',
    'anthropic',
    'openrouter',
    'groq',
    'mistral',
    'deepseek',
    'ollama',
    'custom',
  ]),
  name: z.string().min(1).max(50),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
});

// GET /api/providers — List all configured providers for authenticated user
providersRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const configs = await prisma.providerConfig.findMany({
    where: { userId: req.user!.sub },
    select: {
      id: true,
      provider: true,
      name: true,
      endpoint: true,
      maskedApiKey: true,
      isDefault: true,
      status: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ providers: configs });
});

// POST /api/providers — Add or update provider configuration
providersRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { provider, name, apiKey, endpoint, isDefault } = parsed.data;

  let encryptedApiKey: string | undefined;
  let iv: string | undefined;
  let authTag: string | undefined;
  let maskedApiKey: string | undefined;

  if (apiKey) {
    const enc = encryptApiKey(apiKey);
    encryptedApiKey = enc.encrypted;
    iv = enc.iv;
    authTag = enc.authTag;
    maskedApiKey = maskApiKey(apiKey);
  }

  if (isDefault) {
    await prisma.providerConfig.updateMany({
      where: { userId: req.user!.sub },
      data: { isDefault: false },
    });
  }

  const saved = await prisma.providerConfig.upsert({
    where: {
      userId_provider_name: {
        userId: req.user!.sub,
        provider,
        name,
      },
    },
    update: {
      endpoint: endpoint || null,
      ...(encryptedApiKey ? { encryptedApiKey, iv, authTag, maskedApiKey } : {}),
      isDefault: isDefault ?? false,
    },
    create: {
      userId: req.user!.sub,
      provider,
      name,
      endpoint: endpoint || null,
      encryptedApiKey,
      iv,
      authTag,
      maskedApiKey,
      isDefault: isDefault ?? false,
      status: 'UNVERIFIED',
    },
    select: {
      id: true,
      provider: true,
      name: true,
      endpoint: true,
      maskedApiKey: true,
      isDefault: true,
      status: true,
      createdAt: true,
    },
  });

  res.status(201).json({ provider: saved });
});

// POST /api/providers/:id/test — Test connectivity to provider endpoint
providersRouter.post('/:id/test', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const config = await prisma.providerConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!config || config.userId !== req.user!.sub) {
    res.status(404).json({ error: 'Provider configuration not found' });
    return;
  }

  let apiKey = '';
  if (config.encryptedApiKey && config.iv && config.authTag) {
    try {
      apiKey = decryptApiKey(config.encryptedApiKey, config.iv, config.authTag);
    } catch {
      res.status(500).json({ error: 'Failed to decrypt provider API key' });
      return;
    }
  }

  const adapter = getProviderAdapter(config.provider as LLMProviderType);
  const result = await adapter.testConnection(apiKey, config.endpoint || undefined);

  await prisma.providerConfig.update({
    where: { id: config.id },
    data: {
      status: result.success ? 'CONNECTED' : 'ERROR',
      lastError: result.error || null,
    },
  });

  res.status(200).json(result);
});

// GET /api/providers/models — Discover models dynamically from connected providers, with simulated catalog indication
providersRouter.get('/models', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const providerFilter = (req.query.provider as string) || 'all';

  // Check if we have an authenticated user to fetch connected providers
  let connectedProviders: Array<{ provider: string; encryptedApiKey: string | null; iv: string | null; authTag: string | null; endpoint: string | null }> = [];
  if (req.user?.sub) {
    try {
      connectedProviders = await prisma.providerConfig.findMany({
        where: {
          userId: req.user.sub,
          status: 'CONNECTED',
        },
        select: {
          provider: true,
          encryptedApiKey: true,
          iv: true,
          authTag: true,
          endpoint: true,
        },
      });
    } catch {}
  }

  // If live connected providers exist, attempt dynamic model discovery
  const liveModels: ModelInfo[] = [];
  for (const cfg of connectedProviders) {
    if (providerFilter !== 'all' && cfg.provider !== providerFilter) continue;

    let key = '';
    if (cfg.encryptedApiKey && cfg.iv && cfg.authTag) {
      try {
        key = decryptApiKey(cfg.encryptedApiKey, cfg.iv, cfg.authTag);
      } catch {}
    }

    if (key) {
      try {
        const adapter = getProviderAdapter(cfg.provider as LLMProviderType);
        const discovered = await adapter.listModels(key, cfg.endpoint || undefined);
        liveModels.push(...discovered);
      } catch {}
    }
  }

  if (liveModels.length > 0) {
    res.status(200).json({
      source: 'LIVE_DISCOVERY',
      total: liveModels.length,
      models: liveModels,
    });
    return;
  }

  // If no live connected providers, return catalog annotated as [SIMULATED]
  const catalog =
    providerFilter === 'all'
      ? Object.values(FALLBACK_MODELS).flat()
      : FALLBACK_MODELS[providerFilter as LLMProviderType] || [];

  const annotated = catalog.map((m) => ({
    ...m,
    name: `${m.name} [SIMULATED]`,
    isSimulated: true,
  }));

  res.status(200).json({
    source: 'CATALOG_SIMULATED',
    message: 'No active provider credentials configured or connected. Showing catalog definitions.',
    total: annotated.length,
    models: annotated,
  });
});
