// backend/lambda-fns/common/middleware.ts
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { type ZodSchema } from 'zod';
import { AccessGate, AccessOptions, GuardError } from './access';
import { CORS_HEADERS } from './clients';

/** Paths that must be reachable immediately after login,
 *  before the device row exists. */
const DEVICE_ALLOWLIST: ReadonlySet<string> = new Set<string>(['/auth/complete-login']);

/** Normalize rawPath (strip stage prefix if present) */
function normalizePath(p?: string | null): string {
  if (!p) return '/';
  const parts = p.split('/');
  if (parts.length > 2 && parts[1] && /^[A-Za-z0-9_-]+$/.test(parts[1])) {
    return '/' + parts.slice(2).join('/');
  }
  return p;
}

export type UserContext = {
  userId: string;
  email: string;
  subscriptionActive: boolean;
};

export type WrappedEvent = APIGatewayProxyEventV2 & {
  userContext: UserContext;
  accessOutcome: any;
  parsedBody?: unknown;
};

export type AuthenticatedHandler = (
  event: WrappedEvent,
) => Promise<APIGatewayProxyResultV2>;

type CreateHandlerArgsStatic = {
  schema?: ZodSchema<any>;
  handler: AuthenticatedHandler;
  /** Supports `{ public: true }` to skip auth/device checks. */
  access?: AccessOptions;
};

type CreateHandlerArgsFn = {
  schema?: ZodSchema<any>;
  handler: AuthenticatedHandler;
  /** May return `{ public: true }` dynamically. */
  access?: (event: APIGatewayProxyEventV2) => AccessOptions;
};

const buildCors = (event: APIGatewayProxyEventV2) => {
  const origin = event.headers?.origin || event.headers?.Origin || '*';
  const requested =
    event.headers?.['access-control-request-headers'] ||
    event.headers?.['Access-Control-Request-Headers'] ||
    '*';

  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': requested,
    Vary: 'Origin',
  };
};

// Single union-typed signature (replaces TS overload declarations; avoids no-redeclare)
export function createHandler(
  args: CreateHandlerArgsStatic | CreateHandlerArgsFn,
) {
  const { schema, handler, access } = args;

  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const cors = buildCors(event);

    // CORS preflight
    if (event.requestContext?.http?.method === 'OPTIONS') {
      const out: APIGatewayProxyStructuredResultV2 = { statusCode: 204, headers: cors };
      return out;
    }

    try {
      // Optional: parse & validate JSON body
      let parsedBody: unknown;
      if (schema) {
        try {
          const raw = event.body
            ? event.isBase64Encoded
              ? Buffer.from(event.body, 'base64').toString('utf8')
              : event.body
            : '{}';
          parsedBody = schema.parse(JSON.parse(raw));
        } catch (e: any) {
          return {
            statusCode: 400,
            headers: cors,
            body: JSON.stringify({
              message: 'Invalid request body',
              issues: e?.issues ?? [],
            }),
          };
        }
      }

      // Access options (static or computed)
      const baseAccess: AccessOptions | undefined =
        typeof access === 'function' ? access(event) : access;

      // Normalize path and apply device allowlist for private APIs
      const rawPath = (event.requestContext as any)?.http?.path || (event as any)?.rawPath;
      const path = normalizePath(rawPath);

      // PUBLIC MODE: skip auth/device entirely
      if (baseAccess?.public) {
        const wrapped: WrappedEvent = Object.assign({}, event, {
          parsedBody,
          accessOutcome: { public: true },
          userContext: { userId: 'public', email: '', subscriptionActive: false },
        });
        const res = await handler(wrapped);
        if (typeof res === 'string') {
          return { statusCode: 200, body: res, headers: cors };
        }
        return {
          statusCode: res.statusCode ?? 200,
          body: res.body,
          headers: { ...(res.headers || {}), ...cors },
          cookies: (res as any).cookies,
          isBase64Encoded: (res as any).isBase64Encoded,
        };
      }

      // PRIVATE MODE (default): enforce auth & device
      const gate = AccessGate.fromEnv();

      let effectiveAccess: AccessOptions | undefined = baseAccess;
      if (DEVICE_ALLOWLIST.has(path)) {
        effectiveAccess = {
          ...(baseAccess || {}),
          requireDevice: false,
          enforceDeviceLimit: false,
        };
      }

      const outcome = await gate.enforce(event, effectiveAccess);

      const wrapped: WrappedEvent = Object.assign({}, event, {
        parsedBody,
        accessOutcome: outcome,
        userContext: {
          userId: outcome.user.id,
          email: outcome.user.email,
          subscriptionActive: outcome.subscription.active,
        },
      });

      const res = await handler(wrapped);

      if (typeof res === 'string') {
        return { statusCode: 200, body: res, headers: cors };
      }
      return {
        statusCode: res.statusCode ?? 200,
        body: res.body,
        headers: { ...(res.headers || {}), ...cors },
        cookies: (res as any).cookies,
        isBase64Encoded: (res as any).isBase64Encoded,
      };
    } catch (err: any) {
      if (err instanceof GuardError) {
        return {
          statusCode: err.status,
          headers: cors,
          body: JSON.stringify({ code: err.code, message: err.message, details: err.payload }),
        };
      }
      // keep logging for observability (no global disable needed)
      console.error('Unhandled error:', err);

      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({ message: 'Internal Server Error' }),
      };
    }
  };
}

