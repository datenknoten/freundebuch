import { type } from 'arktype';

// User schemas
export const userSchema = type({
  id: 'string',
  email: 'string',
  passwordHash: 'string',
  createdAt: 'Date',
  updatedAt: 'Date',
});

export const createUserSchema = type({
  email: 'string',
  'password?': 'string>=8',
});

export const loginSchema = type({
  email: 'string',
  password: 'string',
});

// Session schemas
export const sessionSchema = type({
  id: 'string',
  userId: 'string',
  token: 'string',
  expiresAt: 'Date',
  createdAt: 'Date',
});

export type UserType = typeof userSchema.infer;
export type CreateUserType = typeof createUserSchema.infer;
export type LoginType = typeof loginSchema.infer;
export type SessionType = typeof sessionSchema.infer;
