import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import { app } from '../app';
import { ApiVault } from '../lib/apiVault';
import { ApiExecutionEngine } from '../lib/apiExecutionEngine';
import { OpenApiSpecificationParser } from '../lib/openApiParser';
import { AgentToolRegistry } from '@nexora/agents';

// Mock Auth Middleware
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { sub: 'usr-universal-api-test', email: 'architect@nexora.ai', role: 'USER' };
    next();
  },
}));

describe('Universal API Manager & Custom API Integration Test Suite', () => {
  let mockServer: http.Server;
  let mockServerPort: number;

  beforeAll(async () => {
    // Spin up local mock HTTP server for testing real dispatching
    mockServer = http.createServer((req, res) => {
      if (req.url === '/weather/current') {
        const auth = req.headers['authorization'];
        if (auth === 'Bearer test-secret-token-123') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ location: 'San Francisco', temp: 68, condition: 'Sunny' }));
          return;
        }
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Invalid token' }));
        return;
      }

      if (req.url?.startsWith('/data/custom')) {
        const customHeader = req.headers['x-api-key'];
        if (customHeader === 'custom-vault-key-abc') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', items: [1, 2, 3] }));
          return;
        }
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Mock server operational' }));
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => {
        const addr = mockServer.address() as any;
        mockServerPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  // 1. ApiVault Tests
  describe('API Secret Vault (AES-256-GCM)', () => {
    it('encrypts and decrypts secret keys correctly', () => {
      const plaintext = 'sk-live-test-super-secret-key-12345';
      const encrypted = ApiVault.encrypt(plaintext);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.encrypted).not.toEqual(plaintext);

      const decrypted = ApiVault.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('masks secret values properly', () => {
      const masked = ApiVault.mask('sk-live-test-super-secret-key-12345');
      expect(masked.startsWith('sk-')).toBe(true);
      expect(masked.endsWith('2345')).toBe(true);
      expect(masked).toContain('••••••••');
    });
  });

  // 2. SSRF Protection Tests
  describe('SSRF Protection & Network Validation', () => {
    it('blocks cloud metadata IPs like 169.254.169.254', () => {
      expect(ApiExecutionEngine.isBlockedIp('169.254.169.254')).toBe(true);
    });

    it('blocks private 10.x.x.x addresses', () => {
      expect(ApiExecutionEngine.isBlockedIp('10.0.0.1')).toBe(true);
    });

    it('blocks private 192.168.x.x addresses', () => {
      expect(ApiExecutionEngine.isBlockedIp('192.168.1.1')).toBe(true);
    });

    it('blocks private 172.16.x.x - 172.31.x.x addresses', () => {
      expect(ApiExecutionEngine.isBlockedIp('172.20.0.1')).toBe(true);
    });

    it('allows public IP addresses', () => {
      expect(ApiExecutionEngine.isBlockedIp('8.8.8.8')).toBe(false);
      expect(ApiExecutionEngine.isBlockedIp('142.250.190.46')).toBe(false);
    });

    it('rejects unencrypted HTTP in PRODUCTION environment', async () => {
      await expect(
        ApiExecutionEngine.validateUrlSecurity('http://api.example.com', 'PRODUCTION')
      ).rejects.toThrow('Insecure protocol');
    });
  });

  // 3. OpenAPI Specification Parser Tests
  describe('OpenAPI Specification Parser', () => {
    it('parses OpenAPI v3 specs and extracts endpoints accurately', () => {
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Mock Pet Store API', description: 'Testing API', version: '1.0.0' },
        servers: [{ url: 'https://petstore.swagger.io/v2' }],
        paths: {
          '/pets': {
            get: { summary: 'List all pets', operationId: 'listPets' },
            post: { summary: 'Create a pet', operationId: 'createPets' },
          },
        },
      };

      const parsed = OpenApiSpecificationParser.parse(mockSpec);
      expect(parsed.title).toBe('Mock Pet Store API');
      expect(parsed.baseUrl).toBe('https://petstore.swagger.io/v2');
      expect(parsed.endpoints.length).toBe(2);
      expect(parsed.endpoints[0].method).toBe('GET');
      expect(parsed.endpoints[0].path).toBe('/pets');
      expect(parsed.endpoints[1].method).toBe('POST');
    });
  });

  // 4. REST Controller Integration Tests
  describe('Universal APIs REST Controller (/api/universal-apis)', () => {
    it('GET /api/universal-apis/templates returns system presets', async () => {
      const res = await request(app).get('/api/universal-apis/templates');
      expect(res.status).toBe(200);
      expect(res.body.templates).toBeInstanceOf(Array);
      expect(res.body.templates.length).toBeGreaterThan(0);
      expect(res.body.templates[0]).toHaveProperty('baseUrl');
    });

    it('POST /api/universal-apis/test-connection sends a real HTTP request to mock server', async () => {
      const res = await request(app)
        .post('/api/universal-apis/test-connection')
        .send({
          baseUrl: `http://127.0.0.1:${mockServerPort}`,
          endpointPath: '/weather/current',
          method: 'GET',
          environment: 'DEVELOPMENT',
          authType: 'BEARER_TOKEN',
          secret: 'test-secret-token-123',
        });

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.data).toEqual({ location: 'San Francisco', temp: 68, condition: 'Sunny' });
    });

    it('POST /api/universal-apis/test-connection fails with 401 when invalid token is provided', async () => {
      const res = await request(app)
        .post('/api/universal-apis/test-connection')
        .send({
          baseUrl: `http://127.0.0.1:${mockServerPort}`,
          endpointPath: '/weather/current',
          method: 'GET',
          environment: 'DEVELOPMENT',
          authType: 'BEARER_TOKEN',
          secret: 'invalid-token',
        });

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
      expect(res.body.statusCode).toBe(401);
    });

    it('POST /api/universal-apis/import-openapi validates and parses specs via API endpoint', async () => {
      const spec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Weather Service API' },
        servers: [{ url: 'https://api.weather.test/v1' }],
        paths: {
          '/current': {
            get: { summary: 'Get current conditions' },
          },
        },
      });

      const res = await request(app)
        .post('/api/universal-apis/import-openapi')
        .send({ spec });

      expect(res.status).toBe(200);
      expect(res.body.parsed.title).toBe('Weather Service API');
      expect(res.body.parsed.endpoints[0].path).toBe('/current');
    });
  });

  // 5. AI Agent Tool Approval Integration Tests
  describe('Agent Tool Human Approval Policy', () => {
    it('requires approval for call_connected_api on non-idempotent methods', () => {
      const postCheck = AgentToolRegistry.requiresHumanApproval('call_connected_api', {
        method: 'POST',
        endpoint: '/users/create',
      });
      expect(postCheck.requires).toBe(true);
      expect(postCheck.type).toBe('CALL_API');

      const deleteCheck = AgentToolRegistry.requiresHumanApproval('call_connected_api', {
        method: 'DELETE',
        endpoint: '/users/123',
      });
      expect(deleteCheck.requires).toBe(true);
      expect(deleteCheck.type).toBe('CALL_API');
    });

    it('permits idempotent GET read requests without blocking for approval', () => {
      const getCheck = AgentToolRegistry.requiresHumanApproval('call_connected_api', {
        method: 'GET',
        endpoint: '/weather/current',
      });
      expect(getCheck.requires).toBe(false);
    });
  });
});
