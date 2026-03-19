import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastItem } from '../../store/toastStore';
import styles from './ToastContainer.module.scss';

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void; key?: string }) {
  const variant = toast.variant;
  return (
    <motion.div
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4 }}
      className={`${styles.toast} ${styles[variant]}`}
    >
      <span className={styles.message}>{toast.message}</span>
      <button type="button" onClick={onDismiss} className={styles.dismiss} aria-label="Close">
        ×
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const visible = toasts.slice(-3);
  return (
    <div className={styles.container} aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {visible.map((t) => (
          <ToastItemView key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
