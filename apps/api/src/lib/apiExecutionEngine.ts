import dns from 'dns/promises';
import { ApiAuthType, HttpMethod, ApiRequestExecutionResult } from '@nexora/shared';
import { ApiVault } from './apiVault';

export interface ExecuteApiRequestOptions {
  baseUrl: string;
  endpointPath: string;
  method: HttpMethod;
  environment?: 'DEVELOPMENT' | 'PRODUCTION';
  credential?: {
    authType: ApiAuthType;
    encryptedSecret?: string | null;
    iv?: string | null;
    authTag?: string | null;
    headerName?: string | null;
    queryParamKey?: string | null;
    prefix?: string | null;
    customHeaders?: Record<string, string> | null;
  } | null;
  customHeaders?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retryCount?: number;
}

export class ApiExecutionEngine {
  /**
   * SSRF Protection: Checks if IP address belongs to private/internal networks or cloud metadata.
   */
  static isBlockedIp(ip: string): boolean {
    // IPv4 checks
    if (ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0') return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (ip.startsWith('169.254.')) return true; // Link-local & Cloud Metadata (169.254.169.254)

    // 172.16.0.0 – 172.31.255.255
    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }

    // IPv6 checks
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
      return true;
    }

    return false;
  }

  /**
   * Validate destination hostname and enforce HTTPS for production.
   */
  static async validateUrlSecurity(urlString: string, environment: 'DEVELOPMENT' | 'PRODUCTION' = 'PRODUCTION'): Promise<void> {
    let parsed: URL;
    try {
      parsed = new URL(urlString);
    } catch {
      throw new Error(`Invalid URL format: ${urlString}`);
    }

    // Protocol check
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`);
    }

    // Enforce HTTPS for production
    if (environment === 'PRODUCTION' && parsed.protocol !== 'https:') {
      throw new Error('Insecure protocol: HTTPS is strictly required for remote production APIs.');
    }

    const hostname = parsed.hostname;

    // Check special metadata hosts
    if (hostname === 'metadata.google.internal' || hostname === 'instance-data') {
      throw new Error(`Access to internal cloud metadata host ${hostname} is blocked.`);
    }

    // In local dev test runs with explicit localhost allowed for testing
    if (environment === 'DEVELOPMENT' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return;
    }

    // Resolve DNS and check resulting IP addresses
    try {
      const records = await dns.lookup(hostname, { all: true });
      for (const record of records) {
        if (this.isBlockedIp(record.address)) {
          throw new Error(`SSRF Block: Hostname ${hostname} resolved to restricted/private address ${record.address}`);
        }
      }
    } catch (err: any) {
      if (err.message.includes('SSRF Block')) {
        throw err;
      }
      // If DNS resolution fails, reject request
      throw new Error(`DNS lookup failed for host ${hostname}: ${err.message}`);
    }
  }

  /**
   * Execute an API request with security filters, credential injection, timeouts, and retries.
   */
  static async execute(options: ExecuteApiRequestOptions): Promise<ApiRequestExecutionResult> {
    const environment = options.environment || 'DEVELOPMENT';
    const cleanBase = options.baseUrl.replace(/\/+$/, '');
    const cleanPath = options.endpointPath.startsWith('/') ? options.endpointPath : `/${options.endpointPath}`;
    const fullUrlString = `${cleanBase}${cleanPath}`;

    // 1. SSRF and Protocol Security Validation
    await this.validateUrlSecurity(cleanBase, environment);

    // 2. Prepare URL and Query Parameters
    const url = new URL(fullUrlString);
    if (options.queryParams) {
      for (const [key, val] of Object.entries(options.queryParams)) {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      }
    }

    // 3. Prepare Headers
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'NEXORA-AI-Universal-Client/1.0',
      ...(options.customHeaders || {}),
    };

    // 4. Decrypt and Inject Authentication
    if (options.credential && options.credential.authType !== 'NONE') {
      const cred = options.credential;
      let secret = '';
      if (cred.encryptedSecret && cred.iv && cred.authTag) {
        secret = ApiVault.decrypt({
          encrypted: cred.encryptedSecret,
          iv: cred.iv,
          authTag: cred.authTag,
        });
      }

      switch (cred.authType) {
        case 'BEARER_TOKEN':
          headers['Authorization'] = `Bearer ${secret}`;
          break;
        case 'API_KEY': {
          const headerName = cred.headerName || 'x-api-key';
          const prefix = cred.prefix ? `${cred.prefix.trim()} ` : '';
          headers[headerName] = `${prefix}${secret}`;
          break;
        }
        case 'CUSTOM_HEADER': {
          const headerName = cred.headerName || 'Authorization';
          const prefix = cred.prefix ? `${cred.prefix.trim()} ` : '';
          headers[headerName] = `${prefix}${secret}`;
          break;
        }
        case 'BASIC_AUTH': {
          // If secret is user:pass, base64 encode it
          const encoded = Buffer.from(secret).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
          break;
        }
        case 'QUERY_PARAM': {
          const key = cred.queryParamKey || 'api_key';
          url.searchParams.set(key, secret);
          break;
        }
        case 'CUSTOM': {
          if (cred.headerName) {
            headers[cred.headerName] = secret;
          }
          break;
        }
      }

      // Inject any static custom headers defined on the credential
      if (cred.customHeaders && typeof cred.customHeaders === 'object') {
        Object.assign(headers, cred.customHeaders);
      }
    }

    // Strip unsafe headers
    delete headers['host'];
    delete headers['transfer-encoding'];

    // 5. Prepare Payload
    let bodyPayload: string | undefined = undefined;
    if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      if (typeof options.body === 'string') {
        bodyPayload = options.body;
      } else {
        bodyPayload = JSON.stringify(options.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    // 6. Execution with Timeout & Retries
    const timeout = options.timeoutMs || 30000;
    const maxRetries = options.retryCount || 0;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      attempt++;
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url.toString(), {
          method: options.method,
          headers,
          body: bodyPayload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          // Redact sensitive upstream headers
          if (!['set-cookie', 'authorization'].includes(key.toLowerCase())) {
            responseHeaders[key] = val;
          }
        });

        let data: unknown;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch {
            data = await response.text();
          }
        } else {
          data = await response.text();
        }

        return {
          statusCode: response.status,
          statusText: response.statusText,
          durationMs,
          headers: responseHeaders,
          data,
          success: response.ok,
          error: response.ok ? undefined : `Upstream returned status ${response.status}`,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        // If timed out or aborted
        if (err.name === 'AbortError') {
          return {
            statusCode: 504,
            statusText: 'Gateway Timeout',
            durationMs: Date.now() - startTime,
            headers: {},
            data: null,
            success: false,
            error: `Request timed out after ${timeout}ms`,
          };
        }

        // Only retry safe idempotent methods or if retries configured
        if (attempt <= maxRetries && ['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
          // Exponential backoff with jitter
          const backoff = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 5000);
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }

        break;
      }
    }

    return {
      statusCode: 502,
      statusText: 'Bad Gateway',
      durationMs: 0,
      headers: {},
      data: null,
      success: false,
      error: lastError?.message || 'Failed to dispatch request to upstream API',
    };
  }
}
