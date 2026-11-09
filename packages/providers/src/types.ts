import { ModelInfo, LLMProviderType } from '@nexora/shared';

export interface ProviderConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  error?: string;
}

export interface LLMProvider {
  type: LLMProviderType;
  testConnection(apiKey: string, endpoint?: string): Promise<ProviderConnectionTestResult>;
  listModels(apiKey: string, endpoint?: string): Promise<ModelInfo[]>;
}

// Fallback catalog when live discovery is unconfigured/offline
export const FALLBACK_MODELS: Record<LLMProviderType, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Omni)', provider: 'openai', contextWindow: 128000, supportsTools: true, supportsVision: true, isDefault: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, supportsTools: true, supportsVision: true },
    { id: 'o1', name: 'o1 Reasoning', provider: 'openai', contextWindow: 200000, supportsTools: false, supportsVision: true },
    { id: 'o3-mini', name: 'o3 Mini High-Speed', provider: 'openai', contextWindow: 200000, supportsTools: true, supportsVision: false },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', contextWindow: 1048576, supportsTools: true, supportsVision: true, isDefault: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', contextWindow: 2097152, supportsTools: true, supportsVision: true },
    { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', provider: 'gemini', contextWindow: 1048576, supportsTools: true, supportsVision: true },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', provider: 'anthropic', contextWindow: 200000, supportsTools: true, supportsVision: true, isDefault: true },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', contextWindow: 200000, supportsTools: true, supportsVision: true },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000, supportsTools: true, supportsVision: true },
  ],
  openrouter: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', provider: 'openrouter', contextWindow: 200000, supportsTools: true, supportsVision: true },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (OpenRouter)', provider: 'openrouter', contextWindow: 1000000, supportsTools: true, supportsVision: true },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'groq', contextWindow: 128000, supportsTools: true, supportsVision: false, isDefault: true },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq', contextWindow: 128000, supportsTools: true, supportsVision: false },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B High-Throughput', provider: 'groq', contextWindow: 32768, supportsTools: true, supportsVision: false },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large 2', provider: 'mistral', contextWindow: 128000, supportsTools: true, supportsVision: true, isDefault: true },
    { id: 'codestral-latest', name: 'Codestral 25.01', provider: 'mistral', contextWindow: 256000, supportsTools: true, supportsVision: false },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek-V3', provider: 'deepseek', contextWindow: 64000, supportsTools: true, supportsVision: false, isDefault: true },
    { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoner)', provider: 'deepseek', contextWindow: 64000, supportsTools: false, supportsVision: false },
  ],
  ollama: [
    { id: 'llama3.2:latest', name: 'Llama 3.2 (Local)', provider: 'ollama', contextWindow: 128000, supportsTools: true, supportsVision: false, isDefault: true },
    { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder (Local)', provider: 'ollama', contextWindow: 32768, supportsTools: true, supportsVision: false },
  ],
  custom: [
    { id: 'custom-model', name: 'Custom OpenAI-Compatible Endpoint', provider: 'custom', contextWindow: 32768, supportsTools: true, supportsVision: false, isDefault: true },
  ],
};
