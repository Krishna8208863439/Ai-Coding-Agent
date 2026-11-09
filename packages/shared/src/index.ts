export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export type LLMProviderType =
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'openrouter'
  | 'groq'
  | 'mistral'
  | 'deepseek'
  | 'ollama'
  | 'custom';

export interface ProviderConfig {
  id: string;
  provider: LLMProviderType;
  name: string;
  endpoint?: string;
  isDefault: boolean;
  maskedApiKey: string;
  status: 'CONNECTED' | 'ERROR' | 'UNVERIFIED';
  createdAt: string;
  updatedAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProviderType;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  isDefault?: boolean;
}

export type AgentRole =
  | 'ARCHITECT'
  | 'DEVELOPER'
  | 'DEBUGGER'
  | 'TESTER'
  | 'UI_UX'
  | 'SECURITY'
  | 'PROJECT_MANAGER';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  template: string;
  status: 'IDLE' | 'GENERATING' | 'READY' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
}

