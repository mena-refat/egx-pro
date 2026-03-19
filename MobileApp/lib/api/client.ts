import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, clearTokens, getRefreshToken } from '../auth/tokens';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Guard: ensure EXPO_PUBLIC_API_URL is set and uses HTTPS in production builds.
// Plain http:// exposes all traffic (tokens, PII) to network observers.
if (__DEV__ && BASE_URL.startsWith('http://') && !BASE_URL.includes('localhost')) {
  console.warn('[security] API base URL is http:// — set EXPO_PUBLIC_API_URL to https://');
}
if (!__DEV__ && BASE_URL.startsWith('http://')) {
  throw new Error('[security] EXPO_PUBLIC_API_URL must use https:// in production builds. Set the env var correctly.');
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
type Queued = { resolve: (t: string) => void; reject: (e: unknown) => void };
let failedQueue: Queued[] = [];

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'ok' in body) {
      if (!(body as { ok: boolean }).ok) {
        // Preserve response so error interceptor can read error code (not misidentify as NETWORK_ERROR)
        const err = new Error('API_ERROR') as Error & { response: typeof response };
        err.response = response;
        return Promise.reject(err);
      }
      response.data = (body as { data?: unknown }).data;
    }
    return response;
  },
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response && error.code === 'ECONNABORTED') {
      return Promise.reject({ ok: false, error: 'REQUEST_TIMEOUT', message: 'انتهت مهلة الطلب' });
    }

    if (!error.response && error.code !== 'ERR_CANCELED') {
      return Promise.reject({ ok: false, error: 'NETWORK_ERROR', message: 'لا يوجد اتصال' });
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      // Step 1: get stored refresh token
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        failedQueue.forEach((p) => p.reject(error));
        failedQueue = [];
        isRefreshing = false;
        return Promise.reject(error);
      }

      // Step 2: call refresh endpoint — ONLY clear tokens if THIS fails
      let newToken: string;
      try {
        const res = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );
        newToken = res.data?.data?.accessToken ?? res.data?.accessToken;
        await setAccessToken(newToken);
      } catch (refreshError) {
        // Refresh token is invalid/expired → user must log in again
        failedQueue.forEach((p) => p.reject(refreshError));
        failedQueue = [];
        await clearTokens();
        isRefreshing = false;
        return Promise.reject(refreshError);
      }

      // Step 3: retry original request (tokens stay intact even if retry fails)
      failedQueue.forEach((p) => p.resolve(newToken));
      failedQueue = [];
      isRefreshing = false;
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    }

    return Promise.reject(error);
  },
);

export default apiClient;

