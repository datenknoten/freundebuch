import { type } from 'arktype';
import { DateTypeSchema } from './date-type.js';

export const FriendDateResponseSchema = type({
  id: 'string',
  dateValue: 'string',
  yearKnown: 'boolean',
  dateType: DateTypeSchema,
  'label?': 'string',
  createdAt: 'string',
});

export type FriendDateResponse = typeof FriendDateResponseSchema.infer;
