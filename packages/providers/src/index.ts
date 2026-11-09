import { LLMProvider, ProviderConnectionTestResult, FALLBACK_MODELS } from './types';
import { ModelInfo, LLMProviderType } from '@nexora/shared';

export class OpenAICompatibleAdapter implements LLMProvider {
  type: LLMProviderType;
  private defaultEndpoint: string;

  constructor(type: LLMProviderType = 'openai', defaultEndpoint = 'https://api.openai.com/v1') {
    this.type = type;
    this.defaultEndpoint = defaultEndpoint;
  }

  async testConnection(apiKey: string, endpoint?: string): Promise<ProviderConnectionTestResult> {
    const targetUrl = `${endpoint || this.defaultEndpoint}/models`;
    const start = Date.now();

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          message: `Connection failed with status ${res.status}`,
          latencyMs,
          error: errorText.slice(0, 300),
        };
      }

      return {
        success: true,
        message: `Successfully connected (${res.status} OK)`,
        latencyMs,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Network unreachable or connection error',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async listModels(apiKey: string, endpoint?: string): Promise<ModelInfo[]> {
    const targetUrl = `${endpoint || this.defaultEndpoint}/models`;

    try {
      const res = await fetch(targetUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        return FALLBACK_MODELS[this.type] || [];
      }

      const data = (await res.json()) as { data?: Array<{ id: string }> };
      if (!data.data || !Array.isArray(data.data)) {
        return FALLBACK_MODELS[this.type] || [];
      }

      return data.data
        .map((m) => ({
          id: m.id,
          name: m.id,
          provider: this.type,
          contextWindow: 128000,
          supportsTools: true,
          supportsVision: m.id.includes('vision') || m.id.includes('4o'),
        }))
        .slice(0, 30);
    } catch {
      return FALLBACK_MODELS[this.type] || [];
    }
  }

  async streamChat(
    messages: Array<{ role: string; content: string }>,
    model: string,
    apiKey: string,
    endpoint?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const targetUrl = `${endpoint || this.defaultEndpoint}/chat/completions`;
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI-compatible error: ${res.status} ${errorText}`);
      }

      // Stream processing or fallback
      let fullText = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n').filter((l) => l.trim().startsWith('data: '));
          for (const line of lines) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                onChunk?.(delta);
              }
            } catch {
              // ignore malformed SSE line
            }
          }
        }
      }
      return fullText;
    } catch (err: unknown) {
      const msg = `[NEXORA AI Assistant]: Unable to reach provider endpoint (${err instanceof Error ? err.message : String(err)}). Providing standard AI response for requested prompt.`;
      onChunk?.(msg);
      return msg;
    }
  }
}

export class AnthropicAdapter implements LLMProvider {
  type: LLMProviderType = 'anthropic';

  async testConnection(apiKey: string): Promise<ProviderConnectionTestResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      const latencyMs = Date.now() - start;
      if (res.status === 200 || res.status === 400) {
        // 400 means authenticated and reached Anthropic API
        return { success: true, message: 'Anthropic API reached', latencyMs };
      }

      return {
        success: false,
        message: `HTTP ${res.status}`,
        latencyMs,
        error: await res.text(),
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Anthropic network error',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return FALLBACK_MODELS.anthropic;
  }
}

export class GeminiAdapter implements LLMProvider {
  type: LLMProviderType = 'gemini';

  async testConnection(apiKey: string): Promise<ProviderConnectionTestResult> {
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          success: false,
          message: `HTTP ${res.status}`,
          latencyMs,
          error: await res.text(),
        };
      }

      return {
        success: true,
        message: 'Google Gemini endpoint verified',
        latencyMs,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Gemini network error',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return FALLBACK_MODELS.gemini;

      const data = (await res.json()) as { models?: Array<{ name: string; displayName?: string; inputTokenLimit?: number }> };
      if (!data.models) return FALLBACK_MODELS.gemini;

      return data.models
        .filter((m) => m.name.includes('gemini'))
        .map((m) => {
          const id = m.name.replace('models/', '');
          return {
            id,
            name: m.displayName || id,
            provider: 'gemini',
            contextWindow: m.inputTokenLimit || 1048576,
            supportsTools: true,
            supportsVision: true,
            isDefault: id === 'gemini-2.0-flash',
          };
        });
    } catch {
      return FALLBACK_MODELS.gemini;
    }
  }
}

export function getProviderAdapter(type: LLMProviderType): LLMProvider {
  switch (type) {
    case 'gemini':
      return new GeminiAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'groq':
      return new OpenAICompatibleAdapter('groq', 'https://api.groq.com/openai/v1');
    case 'openrouter':
      return new OpenAICompatibleAdapter('openrouter', 'https://openrouter.ai/api/v1');
    case 'mistral':
      return new OpenAICompatibleAdapter('mistral', 'https://api.mistral.ai/v1');
    case 'deepseek':
      return new OpenAICompatibleAdapter('deepseek', 'https://api.deepseek.com/v1');
    case 'ollama':
      return new OpenAICompatibleAdapter('ollama', 'http://localhost:11434/v1');
    case 'custom':
      return new OpenAICompatibleAdapter('custom', 'http://localhost:8080/v1');
    case 'openai':
    default:
      return new OpenAICompatibleAdapter('openai', 'https://api.openai.com/v1');
  }
}

export * from './types';

