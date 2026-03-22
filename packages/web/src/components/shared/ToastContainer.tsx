import React from 'react';
import { useToastStore, type ToastItem } from '../../store/toastStore';
import styles from './ToastContainer.module.scss';

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const variant = toast.variant;
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`${styles.toast} ${styles[variant]} ${styles.toastEnter}`}
    >
      <span className={styles.message}>{toast.message}</span>
      <button type="button" onClick={onDismiss} className={styles.dismiss} aria-label="Close">
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const visible = toasts.slice(-3);
  return (
    <div className={styles.container} aria-label="Notifications">
      {visible.map((t) => (
        <ToastItemView key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
