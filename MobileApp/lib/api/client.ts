import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, clearTokens, getRefreshToken } from '../auth/tokens';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
      if (!(body as { ok: boolean }).ok) return Promise.reject(body);
      response.data = (body as { data?: unknown }).data;
    }
    return response;
  },
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

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

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('no refresh token');

        const res = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
          },
        );

        const newToken: string = res.data?.data?.accessToken ?? res.data?.accessToken;
        await setAccessToken(newToken);

        failedQueue.forEach((p) => p.resolve(newToken));
        failedQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        failedQueue.forEach((p) => p.reject(refreshError));
        failedQueue = [];
        await clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;

