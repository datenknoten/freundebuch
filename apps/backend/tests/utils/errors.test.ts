import { describe, expect, it } from 'vitest';
import * as errors from '../../src/utils/errors.js';

/**
 * The HTTP contract of the error hierarchy.
 *
 * `statusCode` is not decoration: the global handler in `index.ts` turns it
 * into the response status *and* uses `>= 500` to decide whether to page
 * someone via Sentry. A not-found class that accidentally declares 500 would
 * both lie to the client and generate alerts for ordinary misses. `code` is
 * the machine-readable discriminator the frontend switches on.
 *
 * The table is asserted to be complete, so adding a class without deciding its
 * status and code fails here rather than shipping an undeclared contract.
 */
const EXPECTED: Record<string, { status: number; code?: string }> = {
  // 401
  AuthenticationError: { status: 401 },
  // 403
  OnboardingRequiredError: { status: 403, code: 'ONBOARDING_REQUIRED' },
  SignupDisabledError: { status: 403, code: 'SIGNUP_DISABLED' },
  // 404
  UserNotFoundError: { status: 404 },
  FriendNotFoundError: { status: 404 },
  CircleNotFoundError: { status: 404 },
  EncounterNotFoundError: { status: 404 },
  CollectiveNotFoundError: { status: 404 },
  MembershipNotFoundError: { status: 404 },
  AppPasswordNotFoundError: { status: 404 },
  NotificationChannelNotFoundError: { status: 404 },
  ResourceNotFoundError: { status: 404 },
  RoleNotFoundError: { status: 404 },
  // 400
  ValidationError: { status: 400 },
  PhoneCountryUnknownError: { status: 400, code: 'PHONE_COUNTRY_UNKNOWN' },
  InvalidSearchParametersError: { status: 400 },
  // 409
  ConflictError: { status: 409, code: 'CONFLICT' },
  BirthdayAlreadyExistsError: { status: 409 },
  CircularReferenceError: { status: 409 },
  CircleNameExistsError: { status: 409 },
  DuplicateMembershipError: { status: 409 },
  NotificationChannelAlreadyExistsError: { status: 409 },
  // 500
  DataIntegrityError: { status: 500, code: 'DATA_INTEGRITY' },
  FriendCreationError: { status: 500 },
  EncounterCreationError: { status: 500 },
  CircleCreationError: { status: 500 },
  CollectiveCreationError: { status: 500 },
  MembershipCreationError: { status: 500 },
  AppPasswordCreationError: { status: 500 },
  DatabaseConnectionError: { status: 500 },
  UnknownValueError: { status: 500 },
  ConfigurationError: { status: 500 },
  // 502 - an upstream failed, which is not this service's fault
  ExternalServiceError: { status: 502 },
  OverpassApiError: { status: 502 },
  NotificationDeliveryError: { status: 502 },
};

type Constructable = new (...args: never[]) => errors.AppError;

/** Every concrete AppError subclass the module exports. */
function exportedErrorClasses(): [string, Constructable][] {
  const found: [string, Constructable][] = [];
  for (const [name, value] of Object.entries(errors)) {
    if (name === 'AppError' || typeof value !== 'function') continue;
    if (!(value.prototype instanceof errors.AppError)) continue;
    // The prototype check above establishes it is an AppError constructor;
    // the module's export union cannot express that.
    found.push([name, value as Constructable]);
  }
  return found;
}

/**
 * Constructors vary in arity. A single string satisfies most of them; the
 * ExternalServiceError family takes (service, message), and passing a second
 * string is harmless for the rest.
 */
function instantiate(Cls: Constructable): errors.AppError {
  return new (Cls as new (a: string, b: string) => errors.AppError)('probe', 'probe message');
}

describe('AppError hierarchy', () => {
  const discovered = exportedErrorClasses();

  it('exports the classes the table describes, and no undeclared ones', () => {
    expect(discovered.length).toBeGreaterThan(0);
    expect(discovered.map(([name]) => name).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(discovered)('%s carries its declared status and code', (name, Cls) => {
    const expected = EXPECTED[name];
    const instance = instantiate(Cls);

    expect(instance.statusCode).toBe(expected.status);
    expect(instance.code).toBe(expected.code);
    // The handler logs `err.name`; the base class derives it from the
    // constructor so it cannot drift from the class it was thrown from.
    expect(instance.name).toBe(name);
    expect(instance).toBeInstanceOf(Error);
  });

  it('only reports 5xx classes to Sentry, per the handler predicate', () => {
    const paging = discovered
      .filter(([, Cls]) => instantiate(Cls).statusCode >= 500)
      .map(([name]) => name)
      .sort();

    expect(paging).toEqual(
      Object.entries(EXPECTED)
        .filter(([, spec]) => spec.status >= 500)
        .map(([name]) => name)
        .sort(),
    );
  });

  it('keeps the message and optional details it was given', () => {
    const withDetails = new errors.ValidationError('bad input', { field: 'email' });

    expect(withDetails.message).toBe('bad input');
    expect(withDetails.details).toEqual({ field: 'email' });
    // Absent rather than a null-ish placeholder, so the handler can omit it.
    expect(new errors.ValidationError('bad input').details).toBeUndefined();
  });

  it('is recognised by the handler type guard', () => {
    for (const [, Cls] of discovered) {
      expect(errors.isAppError(instantiate(Cls))).toBe(true);
    }
    expect(errors.isAppError(new Error('plain'))).toBe(false);
    expect(errors.isAppError('not an error')).toBe(false);
  });
});
