import { readdirSync } from 'node:fs';
import { AppError } from '@datenknoten/kit';
import { handleError } from '@datenknoten/kit/http';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { AppPasswordCreationError } from '../../src/errors/app-password-creation.error.js';
import { AppPasswordNotFoundError } from '../../src/errors/app-password-not-found.error.js';
import { AuthenticationError } from '../../src/errors/authentication.error.js';
import { BirthdayAlreadyExistsError } from '../../src/errors/birthday-already-exists.error.js';
import { CircleCreationError } from '../../src/errors/circle-creation.error.js';
import { CircleNameExistsError } from '../../src/errors/circle-name-exists.error.js';
import { CircleNotFoundError } from '../../src/errors/circle-not-found.error.js';
import { CircularReferenceError } from '../../src/errors/circular-reference.error.js';
import { CollectiveCreationError } from '../../src/errors/collective-creation.error.js';
import { CollectiveNotFoundError } from '../../src/errors/collective-not-found.error.js';
import { CredentialDecryptError } from '../../src/errors/credential-decrypt.error.js';
import { DataIntegrityError } from '../../src/errors/data-integrity.error.js';
import { DatabaseConnectionError } from '../../src/errors/database-connection.error.js';
import { DuplicateMembershipError } from '../../src/errors/duplicate-membership.error.js';
import { EncounterCreationError } from '../../src/errors/encounter-creation.error.js';
import { EncounterNotFoundError } from '../../src/errors/encounter-not-found.error.js';
import { ExternalServiceError } from '../../src/errors/external-service.error.js';
import { FriendCreationError } from '../../src/errors/friend-creation.error.js';
import { FriendNotFoundError } from '../../src/errors/friend-not-found.error.js';
import { InvalidSearchParametersError } from '../../src/errors/invalid-search-parameters.error.js';
import { LegacyUserAllocationError } from '../../src/errors/legacy-user-allocation.error.js';
import { MaxAppPasswordsExceededError } from '../../src/errors/max-app-passwords-exceeded.error.js';
import { MembershipCreationError } from '../../src/errors/membership-creation.error.js';
import { MembershipNotFoundError } from '../../src/errors/membership-not-found.error.js';
import { NotificationChannelAlreadyExistsError } from '../../src/errors/notification-channel-already-exists.error.js';
import { NotificationChannelNotFoundError } from '../../src/errors/notification-channel-not-found.error.js';
import { NotificationDeliveryError } from '../../src/errors/notification-delivery.error.js';
import { OnboardingRequiredError } from '../../src/errors/onboarding-required.error.js';
import { OverpassApiError } from '../../src/errors/overpass-api.error.js';
import { PhoneCountryUnknownError } from '../../src/errors/phone-country-unknown.error.js';
import { PhotoUploadError } from '../../src/errors/photo-upload.error.js';
import { ResourceNotFoundError } from '../../src/errors/resource-not-found.error.js';
import { RoleNotFoundError } from '../../src/errors/role-not-found.error.js';
import { SignupDisabledError } from '../../src/errors/signup-disabled.error.js';
import { UnknownValueError } from '../../src/errors/unknown-value.error.js';
import { UserNotFoundError } from '../../src/errors/user-not-found.error.js';

const ID = '00000000-0000-0000-0000-000000000001';

const SILENT_LOGGER = pino({ level: 'silent' });

/**
 * The HTTP contract of every application error: the status `handleError` answers
 * with, which also decides Sentry paging at `>= 500`, and the `code` the frontend
 * switches on. A not-found class that answered 500 would lie to the client and
 * page someone for an ordinary miss.
 */
const EXPECTED: Record<string, { error: AppError; status: number; code?: string }> = {
  AuthenticationError: { error: new AuthenticationError(), status: 401, code: 'UNAUTHORIZED' },
  OnboardingRequiredError: {
    error: new OnboardingRequiredError(),
    status: 403,
    code: 'ONBOARDING_REQUIRED',
  },
  SignupDisabledError: { error: new SignupDisabledError(), status: 403, code: 'SIGNUP_DISABLED' },
  UserNotFoundError: { error: new UserNotFoundError(ID), status: 404, code: 'NOT_FOUND' },
  FriendNotFoundError: { error: new FriendNotFoundError(ID), status: 404, code: 'NOT_FOUND' },
  CircleNotFoundError: { error: new CircleNotFoundError(ID), status: 404, code: 'NOT_FOUND' },
  EncounterNotFoundError: { error: new EncounterNotFoundError(ID), status: 404, code: 'NOT_FOUND' },
  CollectiveNotFoundError: {
    error: new CollectiveNotFoundError(ID),
    status: 404,
    code: 'NOT_FOUND',
  },
  MembershipNotFoundError: {
    error: new MembershipNotFoundError(ID),
    status: 404,
    code: 'NOT_FOUND',
  },
  AppPasswordNotFoundError: {
    error: new AppPasswordNotFoundError(ID),
    status: 404,
    code: 'NOT_FOUND',
  },
  NotificationChannelNotFoundError: {
    error: new NotificationChannelNotFoundError(ID),
    status: 404,
    code: 'NOT_FOUND',
  },
  ResourceNotFoundError: {
    error: new ResourceNotFoundError('Note', ID),
    status: 404,
    code: 'NOT_FOUND',
  },
  RoleNotFoundError: { error: new RoleNotFoundError(ID), status: 404, code: 'NOT_FOUND' },
  PhoneCountryUnknownError: {
    error: new PhoneCountryUnknownError(),
    status: 400,
    code: 'PHONE_COUNTRY_UNKNOWN',
  },
  InvalidSearchParametersError: {
    error: new InvalidSearchParametersError(),
    status: 400,
    code: 'VALIDATION_ERROR',
  },
  PhotoUploadError: {
    error: new PhotoUploadError('Invalid image', 'INVALID_IMAGE'),
    status: 400,
    code: 'INVALID_IMAGE',
  },
  BirthdayAlreadyExistsError: {
    error: new BirthdayAlreadyExistsError(),
    status: 409,
    code: 'CONFLICT',
  },
  CircularReferenceError: { error: new CircularReferenceError(), status: 409, code: 'CONFLICT' },
  CircleNameExistsError: { error: new CircleNameExistsError(), status: 409, code: 'CONFLICT' },
  DuplicateMembershipError: {
    error: new DuplicateMembershipError(),
    status: 409,
    code: 'CONFLICT',
  },
  NotificationChannelAlreadyExistsError: {
    error: new NotificationChannelAlreadyExistsError('matrix'),
    status: 409,
    code: 'CONFLICT',
  },
  MaxAppPasswordsExceededError: { error: new MaxAppPasswordsExceededError(20), status: 429 },
  DataIntegrityError: {
    error: new DataIntegrityError('circle role'),
    status: 500,
    code: 'DATA_INTEGRITY',
  },
  FriendCreationError: { error: new FriendCreationError(), status: 500 },
  EncounterCreationError: { error: new EncounterCreationError(), status: 500 },
  CircleCreationError: { error: new CircleCreationError(), status: 500 },
  CollectiveCreationError: { error: new CollectiveCreationError(), status: 500 },
  MembershipCreationError: { error: new MembershipCreationError(), status: 500 },
  AppPasswordCreationError: { error: new AppPasswordCreationError(), status: 500 },
  DatabaseConnectionError: { error: new DatabaseConnectionError(), status: 500 },
  LegacyUserAllocationError: { error: new LegacyUserAllocationError(), status: 500 },
  CredentialDecryptError: {
    error: new CredentialDecryptError('Malformed envelope'),
    status: 500,
    code: 'CREDENTIAL_DECRYPT_FAILED',
  },
  UnknownValueError: { error: new UnknownValueError('thrown string'), status: 500 },
  ExternalServiceError: {
    error: new ExternalServiceError('Nominatim', 'Nominatim unavailable', 503),
    status: 502,
  },
  OverpassApiError: { error: new OverpassApiError(), status: 502 },
  NotificationDeliveryError: {
    error: new NotificationDeliveryError('Matrix', 'upstream body', 500),
    status: 502,
  },
};

function classNameOf(fileName: string) {
  return fileName
    .replace('.error.ts', '')
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')
    .concat('Error');
}

describe('application errors', () => {
  describe('the class table', () => {
    it('lists exactly the classes under src/errors, so a new class must declare its contract', () => {
      const files = readdirSync(new URL('../../src/errors/', import.meta.url));

      expect(files.map(classNameOf).sort()).toEqual(Object.keys(EXPECTED).sort());
    });
  });

  describe('handleError', () => {
    it.each(Object.entries(EXPECTED))(
      'answers %s with its declared status and code',
      (name, spec) => {
        const { status, body } = handleError(spec.error, SILENT_LOGGER);

        expect(status).toBe(spec.status);
        expect(body.code).toBe(spec.code);
        expect(spec.error.name).toBe(name);
        expect(spec.error).toBeInstanceOf(AppError);
      },
    );
  });

  describe('not-found classes', () => {
    it('name the resource and the id that was looked up', () => {
      expect(new FriendNotFoundError(ID).message).toBe(`Friend not found: ${ID}`);
      expect(new ResourceNotFoundError('Note', ID).message).toBe(`Note not found: ${ID}`);
    });
  });

  describe('NotificationDeliveryError', () => {
    it('keeps the upstream body out of the client message', () => {
      const error = new NotificationDeliveryError('Matrix', 'secret upstream body', 500);

      expect(error.message).toBe('Failed to deliver Matrix notification');
      expect(error.detail).toBe('secret upstream body');
    });
  });
});
