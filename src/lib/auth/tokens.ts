const ACCESS_TOKEN_KEY = 'egx_access_token';

export const getAccessToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;

export const setAccessToken = (token: string): void => {
  if (typeof window !== 'undefined') localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const clearTokens = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const refreshAccessToken = async (): Promise<string> => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Refresh failed');
  const data = await response.json();
  const accessToken = data.accessToken;
  if (accessToken) setAccessToken(accessToken);
  return accessToken;
};
