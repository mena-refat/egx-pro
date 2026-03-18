import axios from 'axios';
import { useAdminStore } from '../store/adminAuthStore';

export const adminApi = axios.create({
  baseURL: '/api/admin',
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

