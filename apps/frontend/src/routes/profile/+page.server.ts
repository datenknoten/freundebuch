import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// For SSR, use INTERNAL_API_URL (Docker internal) or fall back to localhost
const API_BASE_URL = process.env.INTERNAL_API_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies }) => {
  const authToken = cookies.get('auth_token');

  if (!authToken) {
    throw error(401, 'Not authenticated');
  }

  try {
    // Fetch user data from the API using the auth token
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch user data');
    }

    const user = await response.json();

    return {
      user,
    };
  } catch (err) {
    console.error('Error loading user data:', err);
    throw error(500, 'Failed to load user data');
  }
};
