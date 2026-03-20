import axios, { type InternalAxiosRequestConfig } from 'axios';
import i18next from 'i18next';
import { getAccessToken, refreshAccessToken, clearTokens } from '../auth/tokens';

const baseURL =
  (typeof window !== 'undefined' &&
    (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && (process.env as { NEXT_PUBLIC_API_URL?: string }).NEXT_PUBLIC_API_URL) ||
  '';

const apiClient = axios.create({
  baseURL: baseURL || undefined,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** طابور الطلبات اللي اتوقفت أثناء تجديد الـ token */
type Queued = { resolve: (token: string) => void; reject: (err: unknown) => void };
let isRefreshing = false;
let failedQueue: Queued[] = [];

// REQUEST INTERCEPTOR - يضيف الـ access token لكل request تلقائياً
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR - فكّ { ok, data } ورفض عند { ok: false }
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'ok' in body) {
      const envelope = body as { ok: boolean; data?: unknown };
      if (!envelope.ok) {
        return Promise.reject(envelope);
      }
      response.data = envelope.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Network error (no response at all)
    if (!error.response && (error as { code?: string }).code !== 'ERR_CANCELED') {
      return Promise.reject({
        ok: false,
        error: 'NETWORK_ERROR',
        message: i18next.t('error.no_internet', { ns: 'common' }),
      });
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        failedQueue.forEach((p) => p.resolve(newToken));
        failedQueue = [];
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach((p) => p.reject(refreshError));
        failedQueue = [];
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
