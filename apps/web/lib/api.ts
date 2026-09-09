export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function getAuthHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (userId) {
    headers['x-user-id'] = userId;
  } else if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nox_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) headers['x-user-id'] = parsed.id;
      }
    } catch (e) {
      // ignore
    }
  }
  
  return headers;
}

export async function fetchWithUser(url: string, options: RequestInit = {}) {
  const headers = getAuthHeaders();
  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
}
