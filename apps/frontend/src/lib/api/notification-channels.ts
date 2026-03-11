import type {
  NotificationChannel,
  NotificationChannelCreateInput,
  NotificationChannelUpdateInput,
} from '$shared';
import { apiRequest } from './client.js';

/**
 * List all notification channels for the authenticated user
 */
export async function listChannels(): Promise<NotificationChannel[]> {
  const result = await apiRequest<{ data: NotificationChannel[] }>('/api/notification-channels');
  return result.data;
}

/**
 * Get a single notification channel by ID
 */
export async function getChannel(channelId: string): Promise<NotificationChannel> {
  const result = await apiRequest<{ data: NotificationChannel }>(
    `/api/notification-channels/${channelId}`,
  );
  return result.data;
}

/**
 * Create a new notification channel
 */
export async function createChannel(
  input: NotificationChannelCreateInput,
): Promise<NotificationChannel> {
  const result = await apiRequest<{ data: NotificationChannel }>('/api/notification-channels', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.data;
}

/**
 * Update an existing notification channel
 */
export async function updateChannel(
  channelId: string,
  input: NotificationChannelUpdateInput,
): Promise<NotificationChannel> {
  const result = await apiRequest<{ data: NotificationChannel }>(
    `/api/notification-channels/${channelId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
  return result.data;
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
): Promise<NotificationChannel> {
  const result = await apiRequest<{ data: NotificationChannel }>(
    `/api/notification-channels/${channelId}/toggle`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled }),
    },
  );
  return result.data;
}
