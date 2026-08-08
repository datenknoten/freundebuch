import type {
  DqFriendFieldsResponse,
  DqIndexResponse,
  DqNotApplicableInput,
  DqSnoozeInput,
  DqSuggestionsResponse,
} from '$shared';
import { apiRequest } from './client.js';

/**
 * Get the data-quality suggestions.
 *
 * Omitting `bucket` returns both buckets in one round trip, which is what the
 * dashboard card needs for its tabs.
 */
export async function getDqSuggestions(
  options: { limit?: number; bucket?: 'quickwins' | 'worthwhile' } = {},
): Promise<DqSuggestionsResponse> {
  const searchParams = new URLSearchParams();

  if (options.limit !== undefined) searchParams.set('limit', options.limit.toString());
  if (options.bucket !== undefined) searchParams.set('bucket', options.bucket);

  const query = searchParams.toString();

  return apiRequest<DqSuggestionsResponse>(
    `/api/data-quality/suggestions${query ? `?${query}` : ''}`,
  );
}

/** Get the data-quality index plus its recent history. */
export async function getDqIndex(days?: number): Promise<DqIndexResponse> {
  const query = days === undefined ? '' : `?days=${days}`;

  return apiRequest<DqIndexResponse>(`/api/data-quality/index${query}`);
}

/** Get the per-field data-quality state for one friend. */
export async function getFriendDqFields(friendId: string): Promise<DqFriendFieldsResponse> {
  return apiRequest<DqFriendFieldsResponse>(`/api/data-quality/friends/${friendId}`);
}

/** Defer a suggestion. The server escalates a second "later" to 90 days. */
export async function snoozeDqItem(
  input: DqSnoozeInput,
): Promise<{ snoozedUntil: string; laterCount: number }> {
  return apiRequest('/api/data-quality/snooze', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Mark a field as never relevant for a friend (or undo that). */
export async function setDqNotApplicable(
  input: DqNotApplicableInput,
): Promise<{ message: string }> {
  return apiRequest('/api/data-quality/not-applicable', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
