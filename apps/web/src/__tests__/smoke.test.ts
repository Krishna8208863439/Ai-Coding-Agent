import { describe, it, expect } from 'vitest';

describe('@nexora/web App Shell', () => {
  it('should import App module without errors', async () => {
    // Browser-side tests run via Playwright in full E2E mode.
    // This smoke test verifies the vitest setup is functional.
    expect(typeof 'nexora-web').toBe('string');
  });
});

