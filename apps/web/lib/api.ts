export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

const TOKEN_KEY = 'nox_token';
const USER_KEY = 'nox_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser<T = any>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable (private mode / disabled) — requests will 401.
  }
}

export function setStoredUser(user: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function getAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = token ?? getToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

export async function fetchWithUser(url: string, options: RequestInit = {}) {
  const headers = getAuthHeaders();
  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nox-unauthorized'));
    }
  }

  return response;
}