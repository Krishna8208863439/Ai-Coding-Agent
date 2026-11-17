import { HttpMethod } from '@nexora/shared';

export interface ParsedOpenApiResult {
  title: string;
  description?: string;
  version?: string;
  baseUrl: string;
  endpoints: Array<{
    name: string;
    path: string;
    method: HttpMethod;
    description?: string;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    requestBodySchema?: Record<string, unknown>;
    responseSchema?: Record<string, unknown>;
  }>;
}

export class OpenApiSpecificationParser {
  /**
   * Parse an OpenAPI v2 (Swagger) or OpenAPI v3 spec from a JSON string or object.
   */
  static parse(input: string | Record<string, unknown>): ParsedOpenApiResult {
    let spec: any;
    if (typeof input === 'string') {
      try {
        spec = JSON.parse(input);
      } catch (err: any) {
        throw new Error(`Failed to parse OpenAPI JSON document: ${err.message}`);
      }
    } else {
      spec = input;
    }

    if (!spec || typeof spec !== 'object') {
      throw new Error('Invalid specification object provided.');
    }

    const title = spec.info?.title || 'Imported API';
    const description = spec.info?.description || '';
    const version = spec.info?.version || '1.0.0';

    // Base URL discovery
    let baseUrl = 'https://api.example.com';
    if (spec.servers && Array.isArray(spec.servers) && spec.servers.length > 0) {
      baseUrl = spec.servers[0].url || baseUrl;
    } else if (spec.host) {
      const scheme = spec.schemes && spec.schemes.length > 0 ? spec.schemes[0] : 'https';
      const basePath = spec.basePath || '';
      baseUrl = `${scheme}://${spec.host}${basePath}`;
    }

    const paths = spec.paths || {};
    const endpoints: ParsedOpenApiResult['endpoints'] = [];

    const allowedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    for (const [pathStr, pathItemObj] of Object.entries(paths)) {
      if (!pathItemObj || typeof pathItemObj !== 'object') continue;

      for (const [methodKey, operationObj] of Object.entries(pathItemObj as Record<string, any>)) {
        const methodUpper = methodKey.toUpperCase() as HttpMethod;
        if (!allowedMethods.includes(methodUpper)) continue;

        const op = operationObj as Record<string, any>;
        const name = op.summary || op.operationId || `${methodUpper} ${pathStr}`;
        const opDesc = op.description || '';

        const queryParams: Record<string, string> = {};
        const headers: Record<string, string> = {};

        // Parse parameters if present
        if (Array.isArray(op.parameters)) {
          for (const param of op.parameters) {
            if (param.in === 'query') {
              queryParams[param.name] = param.description || '';
            } else if (param.in === 'header') {
              headers[param.name] = param.description || '';
            }
          }
        }

        // Parse Request Body (v3 or v2)
        let requestBodySchema: Record<string, unknown> | undefined = undefined;
        if (op.requestBody?.content?.['application/json']?.schema) {
          requestBodySchema = op.requestBody.content['application/json'].schema;
        }

        // Parse Response Schema
        let responseSchema: Record<string, unknown> | undefined = undefined;
        if (op.responses?.['200']?.content?.['application/json']?.schema) {
          responseSchema = op.responses['200'].content['application/json'].schema;
        }

        endpoints.push({
          name,
          path: pathStr,
          method: methodUpper,
          description: opDesc,
          queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          requestBodySchema,
          responseSchema,
        });
      }
    }

    return {
      title,
      description,
      version,
      baseUrl,
      endpoints,
    };
  }
}
