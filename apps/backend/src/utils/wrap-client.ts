import type pg from 'pg';
import { enhanceErrorWithStack } from './enhance-error-with-stack.js';

// Pooled clients are long-lived and reused across many checkouts. Marking a
// client once it's wrapped prevents re-wrapping its `query` on every checkout,
// which would otherwise nest the wrapper deeper each time until invoking
// `client.query` overflows the call stack ("Maximum call stack size exceeded").
// Symbol.for keeps the marker stable across module instances (e.g. tooling
// resolving both wrap-client.js and wrap-client.ts), so a client wrapped by one instance is still
// recognised as wrapped by another.
const WRAPPED = Symbol.for('freundebuch.queryWrapped');

/**
 * Keeps the application stack on query errors. Idempotent: a client whose query
 * is already wrapped is returned unchanged, so reusing a pooled client never
 * stacks wrappers.
 */
export function wrapClient(client: pg.PoolClient) {
  if (WRAPPED in client) {
    return client;
  }

  // biome-ignore lint/suspicious/noExplicitAny: preserving pg's query overload signature
  const originalQuery: (...args: any[]) => any = client.query.bind(client);

  const wrappedQuery = function (
    this: pg.PoolClient,
    // biome-ignore lint/suspicious/noExplicitAny: pg.PoolClient.query has complex overloads
    ...args: [queryTextOrConfig: any, ...rest: any[]]
  ) {
    const callSiteError = new Error();
    Error.captureStackTrace?.(callSiteError, wrappedQuery);

    const result = originalQuery(...args);

    if (result instanceof Promise) {
      return result.catch(rethrowWithCallSite);
    }
    return result;

    function rethrowWithCallSite(error: unknown) {
      throw enhanceErrorWithStack(error, callSiteError.stack ?? '');
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: matching pg's query signature
  client.query = wrappedQuery as any;
  Reflect.set(client, WRAPPED, true);

  return client;
}
