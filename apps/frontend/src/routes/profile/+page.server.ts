import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const sessionToken = locals.sessionToken || cookies.get('session_token');

  if (!sessionToken) {
    throw error(401, 'Not authenticated');
  }

  try {
    // Fetch user data from the API using the session token
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: {
        Cookie: `session_token=${sessionToken}`,
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
