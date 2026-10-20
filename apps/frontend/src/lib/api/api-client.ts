import { parseWith } from '@datenknoten/kit/schema';
import type { Type } from 'arktype';
import type { Logger } from 'pino';
import { type ErrorResponse, ErrorResponseSchema } from '$shared';
import { ApiError } from './api-error.js';

export interface ApiClientOptions {
  baseUrl: string;
  logger: Logger;
  /** Resolves `true` when the user signed in again, so the rejected request is sent once more. */
  onUnauthorized: () => Promise<boolean>;
}

const NO_CONTENT_STATUS = 204;
const UNAUTHORIZED_STATUS = 401;
const UNKNOWN_ERROR_BODY: ErrorResponse = { error: 'An unknown error occurred' };

function buildHeaders(init: RequestInit) {
  const headers = new Headers(init.headers);
  if (init.body instanceof FormData === false && headers.has('Content-Type') === false) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

/**
 * Client of the backend API. Every request sends the session cookie and, unless the body is
 * FormData, a JSON content type.
 *
 * `request` parses a 2xx body with the given schema and throws ValidationError when it does not
 * match. A 204 parses `undefined`, so an endpoint without a body takes `type('undefined')`. Any
 * other status throws ApiError with the backend's error body, or with a generic message when the
 * body is no error response. A 401 first awaits `onUnauthorized` and sends the request once more
 * when it resolves `true`. A network failure rejects with the TypeError of `fetch`.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly onUnauthorized: () => Promise<boolean>;

  public constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.logger = options.logger;
    this.onUnauthorized = options.onUnauthorized;
  }

  public async request<S extends Type>(schema: S, endpoint: string, init: RequestInit = {}) {
    const response = await this.send(endpoint, init, true);
    if (response.status === NO_CONTENT_STATUS) {
      return parseWith(schema, undefined);
    }
    return parseWith(schema, await response.json());
  }

  private async send(
    endpoint: string,
    init: RequestInit,
    shouldReplayOnUnauthorized: boolean,
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...init,
      headers: buildHeaders(init),
      credentials: 'include',
    });
    if (response.ok === true) {
      return response;
    }
    if (response.status === UNAUTHORIZED_STATUS && shouldReplayOnUnauthorized === true) {
      const isReAuthenticated = await this.onUnauthorized();
      if (isReAuthenticated === true) {
        return this.send(endpoint, init, false);
      }
    }
    const body = await this.readErrorBody(response);
    throw new ApiError(response.status, body.error, { code: body.code, details: body.details });
  }

  private async readErrorBody(response: Response) {
    try {
      return parseWith(ErrorResponseSchema, await response.json());
    } catch (err) {
      this.logger.warn({ err, status: response.status }, 'Unreadable API error body');
      return UNKNOWN_ERROR_BODY;
    }
  }
}
