import axios from 'axios';
import i18next from 'i18next';
import { useAuthStore } from '../store/authStore';

// عند نشر الفرونت على دومين والـ API على آخر (مثلاً Vercel + Railway) ضع VITE_API_URL في بيئة البناء
const apiBase =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.trim();
const baseURL = apiBase
  ? `${apiBase.replace(/\/$/, '')}/api`
  : '/api';

/** عنوان أساس الـ API (للاستخدام مع fetch عند فصل الفرونت عن الباكند) */
export function getApiBase(): string {
  return baseURL;
}

const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true, // إرسال httpOnly cookie مع كل طلب (للـ refresh)
  headers: {
    'Content-Type': 'application/json',
  },
});

/** وقت أطول لطلبات التحليل (جمع بيانات + محرك AI مع إعادة محاولة قد تصل لـ 3 دقائق) */
export const ANALYSIS_TIMEOUT_MS = 300_000; // 5 دقائق

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 and token refresh
let isRefreshing = false;
type QueuedPromise = { resolve: (token: string | null) => void; reject: (err: unknown) => void };
let failedQueue: QueuedPromise[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    const list = body && typeof body === 'object' && 'newUnseenAchievements' in body
      ? (body as { newUnseenAchievements?: unknown[] }).newUnseenAchievements
      : undefined;
    if (Array.isArray(list) && list.length > 0) {
      useAuthStore.getState().addUnseenAchievementsCount(list.length);
    }
    if (body && typeof body === 'object' && 'ok' in body) {
      const envelope = body as { ok: boolean; data?: unknown };
      if (!envelope.ok) return Promise.reject(envelope);
      response.data = envelope.data;
    }
    return response;
  },
  async (error) => {
    if (!error.response && error.code !== 'ERR_CANCELED') {
      return Promise.reject({
        ok: false,
        error: 'NETWORK_ERROR',
        message: i18next.t('error.no_internet', { ns: 'common' }),
      });
    }

    const originalRequest = error.config;

    // FIX 1: also skip requests already marked _noRetry (e.g. the refresh request itself)
    // to prevent an infinite deadlock when the refresh token is also expired.
    if (error.response?.status === 401 && !originalRequest?._retry && !originalRequest?._noRetry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // FIX 1: mark the refresh call with _noRetry so if it gets a 401
        // (expired/invalid refresh token) it won't re-enter this flow and deadlock.
        const response = await api.post('/auth/refresh', null, {
          withCredentials: true,
          _noRetry: true,
        } as Parameters<typeof api.post>[2]);

        const payload = (response.data as { data?: { accessToken?: string } })?.data ?? response.data;
        const accessToken = (payload as { accessToken?: string })?.accessToken;

        // FIX 3: guard — if refresh returned no token, treat it as a failure
        if (!accessToken) throw new Error('REFRESH_RETURNED_NO_TOKEN');

        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setAuth(currentUser, accessToken);
        } else {
          // Persisted user missing — force logout so getMe can re-establish session
          useAuthStore.getState().logout();
          processQueue(new Error('NO_USER'), null);
          return Promise.reject(new Error('NO_USER'));
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
