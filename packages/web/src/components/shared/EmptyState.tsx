import { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className={styles.root} role="status" aria-label={title}>
      <div className={styles.iconWrap}>
        <Icon className={styles.icon} aria-hidden />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
});

export default EmptyState;
