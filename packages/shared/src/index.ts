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

// ==========================================
// Universal API Manager Types
// ==========================================

export type ApiAuthType =
  | 'NONE'
  | 'API_KEY'
  | 'BEARER_TOKEN'
  | 'BASIC_AUTH'
  | 'OAUTH2'
  | 'CUSTOM_HEADER'
  | 'QUERY_PARAM'
  | 'CUSTOM';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ApiConfigStatus = 'CONNECTED' | 'ERROR' | 'UNVERIFIED' | 'DISABLED';

export interface ApiCredentialSummary {
  authType: ApiAuthType;
  maskedValue?: string;
  headerName?: string;
  queryParamKey?: string;
  prefix?: string;
  customHeaders?: Record<string, string>;
}

export interface ApiEndpointItem {
  id: string;
  apiConfigId: string;
  name: string;
  path: string;
  method: HttpMethod;
  description?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBodySchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  sampleRequest?: Record<string, unknown>;
  sampleResponse?: Record<string, unknown>;
}

export interface ApiUsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDurationMs: number;
  lastRequestAt?: string;
  rateLimitHits: number;
}

export interface ApiConfigurationSummary {
  id: string;
  name: string;
  providerName?: string;
  description?: string;
  category: string;
  baseUrl: string;
  environment: 'DEVELOPMENT' | 'PRODUCTION';
  status: ApiConfigStatus;
  rateLimitPerMin: number;
  timeoutMs: number;
  retryCount: number;
  isDefault: boolean;
  lastTestedAt?: string;
  lastUsedAt?: string;
  lastError?: string;
  credential?: ApiCredentialSummary;
  endpoints?: ApiEndpointItem[];
  usage?: ApiUsageSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRequestExecutionResult {
  statusCode: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  data: unknown;
  success: boolean;
  error?: string;
}


