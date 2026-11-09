import { describe, it, expect } from 'vitest';
import { getProviderAdapter, FALLBACK_MODELS } from '../index';

describe('@nexora/providers Adapter Factory', () => {
  it('instantiates GeminiAdapter for gemini', () => {
    const adapter = getProviderAdapter('gemini');
    expect(adapter.type).toBe('gemini');
  });

  it('instantiates AnthropicAdapter for anthropic', () => {
    const adapter = getProviderAdapter('anthropic');
    expect(adapter.type).toBe('anthropic');
  });

  it('instantiates OpenAICompatibleAdapter for openai', () => {
    const adapter = getProviderAdapter('openai');
    expect(adapter.type).toBe('openai');
  });

  it('provides verified fallback models when endpoint is unconfigured', () => {
    expect(FALLBACK_MODELS.openai.length).toBeGreaterThan(0);
    expect(FALLBACK_MODELS.gemini.length).toBeGreaterThan(0);
    expect(FALLBACK_MODELS.anthropic.length).toBeGreaterThan(0);
  });
});
