import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { MatrixCredentialsSchema, MatrixCredentialsUpdateSchema } from './matrix-credentials.js';

const VALID = {
  homeserver: 'https://matrix.example.org',
  accessToken: 'syt_token',
  roomId: '!room:example.org',
};

describe('MatrixCredentialsSchema', () => {
  describe('with complete credentials', () => {
    it('accepts an https homeserver', () => {
      expect(MatrixCredentialsSchema(VALID)).toEqual(VALID);
    });
  });

  describe('with a non-https homeserver', () => {
    it.each(['http://matrix.example.org', 'matrix.example.org', 'ftp://matrix.example.org'])(
      'rejects %s',
      (homeserver) => {
        expect(MatrixCredentialsSchema({ ...VALID, homeserver })).toBeInstanceOf(type.errors);
      },
    );
  });

  describe('with a missing or malformed field', () => {
    it.each(['homeserver', 'accessToken', 'roomId'])('rejects credentials without %s', (key) => {
      const credentials: Record<string, string> = { ...VALID };
      delete credentials[key];
      expect(MatrixCredentialsSchema(credentials)).toBeInstanceOf(type.errors);
    });

    it('rejects an empty access token', () => {
      expect(MatrixCredentialsSchema({ ...VALID, accessToken: '' })).toBeInstanceOf(type.errors);
    });

    it('rejects a room id without the leading ! and server part', () => {
      expect(MatrixCredentialsSchema({ ...VALID, roomId: 'room' })).toBeInstanceOf(type.errors);
    });
  });
});

describe('MatrixCredentialsUpdateSchema', () => {
  describe('with partial credentials', () => {
    it('accepts an empty update', () => {
      expect(MatrixCredentialsUpdateSchema({})).toEqual({});
    });

    it('still rejects an http homeserver', () => {
      expect(
        MatrixCredentialsUpdateSchema({ homeserver: 'http://matrix.example.org' }),
      ).toBeInstanceOf(type.errors);
    });
  });
});
