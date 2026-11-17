import express, { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { ApiVault } from '../lib/apiVault';
import { ApiExecutionEngine } from '../lib/apiExecutionEngine';
import { OpenApiSpecificationParser } from '../lib/openApiParser';
import { ApiAuthType, HttpMethod } from '@nexora/shared';

export const universalApisRouter: Router = express.Router();

// Preset starter templates
const SYSTEM_TEMPLATES = [
  {
    name: 'OpenAI REST API',
    category: 'AI and LLM APIs',
    description: 'Direct REST integration with OpenAI Chat Completions and Models API.',
    providerName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'BEARER_TOKEN',
    headerName: 'Authorization',
    prefix: 'Bearer',
    defaultHeaders: { 'Content-Type': 'application/json' },
    defaultEndpoints: [
      { name: 'List Models', path: '/models', method: 'GET', description: 'Lists the currently available models.' },
      { name: 'Chat Completions', path: '/chat/completions', method: 'POST', description: 'Creates a model response for the given chat conversation.' },
    ],
  },
  {
    name: 'GitHub REST API',
    category: 'Developer APIs',
    description: 'Interact with GitHub repositories, issues, pulls, and user profiles.',
    providerName: 'GitHub',
    baseUrl: 'https://api.github.com',
    authType: 'BEARER_TOKEN',
    headerName: 'Authorization',
    prefix: 'Bearer',
    defaultHeaders: { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    defaultEndpoints: [
      { name: 'Get Authenticated User', path: '/user', method: 'GET', description: 'Get the authenticated user.' },
      { name: 'List User Repositories', path: '/user/repos', method: 'GET', description: 'Lists repositories that the authenticated user has access to.' },
      { name: 'List Issues', path: '/issues', method: 'GET', description: 'List all issues across owned and member repositories.' },
    ],
  },
  {
    name: 'OpenWeatherMap API',
    category: 'Weather APIs',
    description: 'Current weather and forecast data for any geographic coordinate.',
    providerName: 'OpenWeather',
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    authType: 'QUERY_PARAM',
    queryParamKey: 'appid',
    defaultHeaders: { 'Accept': 'application/json' },
    defaultEndpoints: [
      { name: 'Current Weather', path: '/weather', method: 'GET', description: 'Get current weather data by city or coordinates.' },
      { name: '5 Day Forecast', path: '/forecast', method: 'GET', description: '5-day forecast with 3-hour step.' },
    ],
  },
  {
    name: 'Stripe API',
    category: 'Payment APIs',
    description: 'Payment processing, customer management, subscriptions, and payouts.',
    providerName: 'Stripe',
    baseUrl: 'https://api.stripe.com/v1',
    authType: 'BEARER_TOKEN',
    headerName: 'Authorization',
    prefix: 'Bearer',
    defaultHeaders: { 'Content-Type': 'application/x-www-form-urlencoded' },
    defaultEndpoints: [
      { name: 'List Customers', path: '/customers', method: 'GET', description: 'Returns a list of your customers.' },
      { name: 'List Payment Intents', path: '/payment_intents', method: 'GET', description: 'Returns a list of PaymentIntents.' },
    ],
  },
];

// Validation Schemas
const createApiSchema = z.object({
  name: z.string().min(1).max(100),
  providerName: z.string().optional(),
  description: z.string().optional(),
  category: z.string().default('Custom APIs'),
  baseUrl: z.string().url(),
  environment: z.enum(['DEVELOPMENT', 'PRODUCTION']).default('DEVELOPMENT'),
  rateLimitPerMin: z.number().int().min(1).max(10000).default(60),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  retryCount: z.number().int().min(0).max(5).default(0),
  isDefault: z.boolean().default(false),
  // Authentication
  authType: z.enum([
    'NONE',
    'API_KEY',
    'BEARER_TOKEN',
    'BASIC_AUTH',
    'OAUTH2',
    'CUSTOM_HEADER',
    'QUERY_PARAM',
    'CUSTOM',
  ]).default('NONE'),
  secret: z.string().optional(),
  headerName: z.string().optional(),
  queryParamKey: z.string().optional(),
  prefix: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  // Initial Endpoints
  endpoints: z.array(
    z.object({
      name: z.string().min(1),
      path: z.string().min(1),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
      description: z.string().optional(),
      headers: z.record(z.string()).optional(),
      queryParams: z.record(z.string()).optional(),
      requestBodySchema: z.record(z.unknown()).optional(),
      responseSchema: z.record(z.unknown()).optional(),
      sampleRequest: z.record(z.unknown()).optional(),
      sampleResponse: z.record(z.unknown()).optional(),
    })
  ).optional(),
});

const updateApiSchema = createApiSchema.partial();

const testConnectionSchema = z.object({
  baseUrl: z.string().url(),
  endpointPath: z.string().default('/'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  environment: z.enum(['DEVELOPMENT', 'PRODUCTION']).default('DEVELOPMENT'),
  authType: z.enum([
    'NONE',
    'API_KEY',
    'BEARER_TOKEN',
    'BASIC_AUTH',
    'OAUTH2',
    'CUSTOM_HEADER',
    'QUERY_PARAM',
    'CUSTOM',
  ]).default('NONE'),
  secret: z.string().optional(),
  headerName: z.string().optional(),
  queryParamKey: z.string().optional(),
  prefix: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().optional(),
});

// GET /api/universal-apis — List all configured APIs for user
universalApisRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const configs = await prisma.apiConfiguration.findMany({
    where: { userId: req.user!.sub },
    include: {
      credential: {
        select: {
          authType: true,
          maskedValue: true,
          headerName: true,
          queryParamKey: true,
          prefix: true,
          customHeaders: true,
        },
      },
      endpoints: true,
      usage: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ apis: configs });
});

// GET /api/universal-apis/templates — List starter API templates
universalApisRouter.get('/templates', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({ templates: SYSTEM_TEMPLATES });
});

// GET /api/universal-apis/usage — Aggregated usage analytics
universalApisRouter.get('/usage', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const usages = await prisma.apiUsage.findMany({
    where: { apiConfig: { userId: req.user!.sub } },
    include: {
      apiConfig: {
        select: { id: true, name: true, category: true, baseUrl: true },
      },
    },
  });

  const totals = usages.reduce(
    (acc, curr) => {
      acc.totalRequests += curr.totalRequests;
      acc.successfulRequests += curr.successfulRequests;
      acc.failedRequests += curr.failedRequests;
      acc.rateLimitHits += curr.rateLimitHits;
      return acc;
    },
    { totalRequests: 0, successfulRequests: 0, failedRequests: 0, rateLimitHits: 0 }
  );

  res.status(200).json({ totals, usages });
});

// GET /api/universal-apis/logs — Recent request logs
universalApisRouter.get('/logs', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const logs = await prisma.apiRequestLog.findMany({
    where: { userId: req.user!.sub },
    include: {
      apiConfig: { select: { id: true, name: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.status(200).json({ logs });
});

// POST /api/universal-apis/test-connection — Test real connection without saving
universalApisRouter.post('/test-connection', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = testConnectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { baseUrl, endpointPath, method, environment, authType, secret, headerName, queryParamKey, prefix, customHeaders, queryParams, body, timeoutMs } = parsed.data;

  let credentialPayload = null;
  if (authType !== 'NONE' && secret) {
    const encrypted = ApiVault.encrypt(secret);
    credentialPayload = {
      authType: authType as ApiAuthType,
      encryptedSecret: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      headerName,
      queryParamKey,
      prefix,
      customHeaders,
    };
  }

  try {
    const result = await ApiExecutionEngine.execute({
      baseUrl,
      endpointPath,
      method: method as HttpMethod,
      environment,
      credential: credentialPayload,
      customHeaders,
      queryParams,
      body,
      timeoutMs: timeoutMs || 15000,
    });

    res.status(200).json({
      connected: result.success,
      statusCode: result.statusCode,
      statusText: result.statusText,
      durationMs: result.durationMs,
      headers: result.headers,
      data: result.data,
      error: result.error,
    });
  } catch (err: any) {
    res.status(400).json({
      connected: false,
      statusCode: 400,
      statusText: 'Security or Network Error',
      durationMs: 0,
      headers: {},
      data: null,
      error: err.message,
    });
  }
});

// POST /api/universal-apis/import-openapi — Parse OpenAPI spec from JSON/YAML string
universalApisRouter.post('/import-openapi', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { spec } = req.body;
  if (!spec) {
    res.status(400).json({ error: 'OpenAPI specification document is required.' });
    return;
  }

  try {
    const parsed = OpenApiSpecificationParser.parse(spec);
    res.status(200).json({ parsed });
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
});

// POST /api/universal-apis — Create new API configuration
universalApisRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createApiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const data = parsed.data;

  // Check name uniqueness per user
  const existing = await prisma.apiConfiguration.findFirst({
    where: { userId: req.user!.sub, name: data.name },
  });
  if (existing) {
    res.status(409).json({ error: `An API configuration named "${data.name}" already exists.` });
    return;
  }

  // Create configuration and credentials in a transaction
  const config = await prisma.apiConfiguration.create({
    data: {
      userId: req.user!.sub,
      name: data.name,
      providerName: data.providerName,
      description: data.description,
      category: data.category,
      baseUrl: data.baseUrl,
      environment: data.environment,
      rateLimitPerMin: data.rateLimitPerMin,
      timeoutMs: data.timeoutMs,
      retryCount: data.retryCount,
      isDefault: data.isDefault,
      status: 'UNVERIFIED',
      usage: {
        create: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgDurationMs: 0,
          rateLimitHits: 0,
        },
      },
    },
  });

  // Handle Credential
  if (data.authType !== 'NONE') {
    let encryptedSecret = null;
    let iv = null;
    let authTag = null;

    if (data.secret && data.secret.trim().length > 0) {
      const enc = ApiVault.encrypt(data.secret);
      encryptedSecret = enc.encrypted;
      iv = enc.iv;
      authTag = enc.authTag;
    }

    await prisma.apiCredential.create({
      data: {
        apiConfigId: config.id,
        authType: data.authType,
        encryptedSecret,
        iv,
        authTag,
        maskedValue: ApiVault.mask(data.secret),
        headerName: data.headerName,
        queryParamKey: data.queryParamKey,
        prefix: data.prefix,
        customHeaders: data.customHeaders ? (data.customHeaders as any) : undefined,
      },
    });
  }

  // Handle Endpoints
  if (data.endpoints && data.endpoints.length > 0) {
    await prisma.apiEndpoint.createMany({
      data: data.endpoints.map((ep) => ({
        apiConfigId: config.id,
        name: ep.name,
        path: ep.path,
        method: ep.method,
        description: ep.description,
        headers: ep.headers ? (ep.headers as any) : undefined,
        queryParams: ep.queryParams ? (ep.queryParams as any) : undefined,
        requestBodySchema: ep.requestBodySchema ? (ep.requestBodySchema as any) : undefined,
        responseSchema: ep.responseSchema ? (ep.responseSchema as any) : undefined,
        sampleRequest: ep.sampleRequest ? (ep.sampleRequest as any) : undefined,
        sampleResponse: ep.sampleResponse ? (ep.sampleResponse as any) : undefined,
      })),
    });
  }

  const created = await prisma.apiConfiguration.findUnique({
    where: { id: config.id },
    include: {
      credential: {
        select: {
          authType: true,
          maskedValue: true,
          headerName: true,
          queryParamKey: true,
          prefix: true,
          customHeaders: true,
        },
      },
      endpoints: true,
      usage: true,
    },
  });

  res.status(201).json({ api: created });
});

// GET /api/universal-apis/:id — Get details of specific API
universalApisRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const config = await prisma.apiConfiguration.findFirst({
    where: { id: req.params.id, userId: req.user!.sub },
    include: {
      credential: {
        select: {
          authType: true,
          maskedValue: true,
          headerName: true,
          queryParamKey: true,
          prefix: true,
          customHeaders: true,
        },
      },
      endpoints: true,
      usage: true,
      permissions: true,
    },
  });

  if (!config) {
    res.status(404).json({ error: 'API Configuration not found.' });
    return;
  }

  res.status(200).json({ api: config });
});

// POST /api/universal-apis/:id/test — Test and update status of existing configured API
universalApisRouter.post('/:id/test', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const config = await prisma.apiConfiguration.findFirst({
    where: { id: req.params.id, userId: req.user!.sub },
    include: { credential: true, endpoints: true, usage: true },
  });

  if (!config) {
    res.status(404).json({ error: 'API Configuration not found.' });
    return;
  }

  const targetEndpoint = config.endpoints[0]?.path || '/';
  const targetMethod = (config.endpoints[0]?.method as HttpMethod) || 'GET';

  const startTime = Date.now();
  try {
    const result = await ApiExecutionEngine.execute({
      baseUrl: config.baseUrl,
      endpointPath: targetEndpoint,
      method: targetMethod,
      environment: config.environment as any,
      credential: config.credential
        ? {
            authType: config.credential.authType as ApiAuthType,
            encryptedSecret: config.credential.encryptedSecret,
            iv: config.credential.iv,
            authTag: config.credential.authTag,
            headerName: config.credential.headerName,
            queryParamKey: config.credential.queryParamKey,
            prefix: config.credential.prefix,
            customHeaders: config.credential.customHeaders as any,
          }
        : null,
      timeoutMs: config.timeoutMs,
      retryCount: config.retryCount,
    });

    const newStatus = result.success ? 'CONNECTED' : 'ERROR';

    // Update config status
    await prisma.apiConfiguration.update({
      where: { id: config.id },
      data: {
        status: newStatus,
        lastTestedAt: new Date(),
        lastError: result.error || null,
      },
    });

    // Record request log
    await prisma.apiRequestLog.create({
      data: {
        apiConfigId: config.id,
        userId: req.user!.sub,
        endpointPath: targetEndpoint,
        method: targetMethod,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        success: result.success,
        error: result.error,
        initiatedBy: 'TEST',
      },
    });

    // Update usage counters
    if (config.usage) {
      await prisma.apiUsage.update({
        where: { id: config.usage.id },
        data: {
          totalRequests: { increment: 1 },
          successfulRequests: result.success ? { increment: 1 } : undefined,
          failedRequests: !result.success ? { increment: 1 } : undefined,
          lastRequestAt: new Date(),
        },
      });
    }

    res.status(200).json({
      connected: result.success,
      status: newStatus,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      headers: result.headers,
      data: result.data,
      error: result.error,
    });
  } catch (err: any) {
    await prisma.apiConfiguration.update({
      where: { id: config.id },
      data: {
        status: 'ERROR',
        lastTestedAt: new Date(),
        lastError: err.message,
      },
    });

    res.status(400).json({
      connected: false,
      status: 'ERROR',
      statusCode: 400,
      durationMs: Date.now() - startTime,
      headers: {},
      data: null,
      error: err.message,
    });
  }
});

// DELETE /api/universal-apis/:id — Delete an API configuration
universalApisRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await prisma.apiConfiguration.findFirst({
    where: { id: req.params.id, userId: req.user!.sub },
  });

  if (!existing) {
    res.status(404).json({ error: 'API Configuration not found.' });
    return;
  }

  await prisma.apiConfiguration.delete({
    where: { id: req.params.id },
  });

  res.status(200).json({ success: true, message: `API "${existing.name}" deleted successfully.` });
});
