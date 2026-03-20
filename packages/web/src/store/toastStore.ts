import { create } from 'zustand';

export type ToastVariant = 'success' | 'danger' | 'warning' | 'default';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 4000;

interface ToastState {
  toasts: ToastItem[];
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const duration = toast.duration ?? DEFAULT_DURATION_MS;
    set((s) => ({ toasts: [...s.toasts.slice(-(MAX_VISIBLE - 1)), { ...toast, id }] }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Legacy type alias and helpers - map to new variant. */
export type ToastType = 'success' | 'error' | 'info';
export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast({ message, variant: 'success', duration: durationMs }),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast({ message, variant: 'danger', duration: durationMs ?? 6000 }),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast({ message, variant: 'default', duration: durationMs }),
  warning: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast({ message, variant: 'warning', duration: durationMs }),
};
