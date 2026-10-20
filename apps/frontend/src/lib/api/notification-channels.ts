import type {
  NotificationChannelCreateInput,
  NotificationChannelResponse,
  NotificationChannelUpdateInput,
} from '$shared';
import { apiRequest } from './client.js';

/**
 * List all notification channels for the authenticated user
 */
export async function listChannels(): Promise<NotificationChannelResponse[]> {
  return apiRequest<NotificationChannelResponse[]>('/api/notification-channels');
}

/**
 * Get a single notification channel by ID
 */
export async function getChannel(channelId: string): Promise<NotificationChannelResponse> {
  return apiRequest<NotificationChannelResponse>(`/api/notification-channels/${channelId}`);
}

/**
 * Create a new notification channel
 */
export async function createChannel(
  input: NotificationChannelCreateInput,
): Promise<NotificationChannelResponse> {
  return apiRequest<NotificationChannelResponse>('/api/notification-channels', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update an existing notification channel
 */
export async function updateChannel(
  channelId: string,
  input: NotificationChannelUpdateInput,
): Promise<NotificationChannelResponse> {
  return apiRequest<NotificationChannelResponse>(`/api/notification-channels/${channelId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete a notification channel
 */
export async function deleteChannel(channelId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/api/notification-channels/${channelId}`, {
    method: 'DELETE',
  });
}

/**
 * Send a test message to a notification channel
 */
export async function testChannel(channelId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/api/notification-channels/${channelId}/test`, {
    method: 'POST',
  });
}

/**
 * Toggle a channel's enabled/disabled state
 */
export async function toggleChannel(
  channelId: string,
  isEnabled: boolean,
): Promise<NotificationChannelResponse> {
  return apiRequest<NotificationChannelResponse>(`/api/notification-channels/${channelId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  });
}
