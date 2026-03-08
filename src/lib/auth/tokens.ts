let _token: string | null = null;

export const getAccessToken = (): string | null => _token;
export const setAccessToken = (token: string): void => { _token = token; };
export const clearTokens = (): void => { _token = null; };

export const refreshAccessToken = async (): Promise<string> => {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  const payload = (data as { data?: { accessToken?: string } })?.data ?? data;
  if (payload?.accessToken) setAccessToken(payload.accessToken);
  return payload?.accessToken ?? '';
};
