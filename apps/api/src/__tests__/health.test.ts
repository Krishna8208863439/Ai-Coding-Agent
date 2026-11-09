import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('NEXORA API Foundation Checks', () => {
  it('GET /api/health returns healthy system status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.version).toBe('0.1.0');
    expect(typeof response.body.uptime).toBe('number');
  });

  it('GET /api/phases returns phase progress with Phase 1 ACTIVE', async () => {
    const response = await request(app).get('/api/phases');
    expect(response.status).toBe(200);
    expect(response.body.activePhase).toBe(1);
    expect(response.body.allPhases).toHaveLength(10);
    expect(response.body.allPhases[0].status).toBe('ACTIVE');
    expect(response.body.allPhases[1].status).toBe('LOCKED');
  });
});
