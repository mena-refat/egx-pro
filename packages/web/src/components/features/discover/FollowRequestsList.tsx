import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PendingRequest } from './types';
import { Button } from '../../ui/Button';
import styles from '../../../pages/DiscoverPage.module.scss';

interface FollowRequestsListProps {
  requests: PendingRequest[];
  t: (k: string) => string;
  onAccept: (followerId: string) => void;
  onDecline: (followerId: string) => void;
}

export function FollowRequestsList({ requests, t, onAccept, onDecline }: FollowRequestsListProps) {
  const navigate = useNavigate();
  return (
    <ul className={styles.userList}>
      {requests.map((r) => (
        <li key={r.followerId} className={styles.userItem}>
          <div className={styles.requestRow}>
            <button
              type="button"
              onClick={() => r.follower.username && navigate(`/profile/${r.follower.username}`)}
              className={styles.userButton}
            >
              <div className={styles.userAvatar}>
                {r.follower.avatarUrl ? (
                  <img
                    src={r.follower.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className={styles.avatarImg}
                    loading="lazy"
                  />
                ) : (
                  <Users
                    style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-muted)' }}
                    aria-hidden
                  />
                )}
              </div>
              <p className={styles.userName}>
                {r.follower.fullName ?? `@${r.follower.username}`}
              </p>
            </button>
            <div className={styles.requestActions}>
              <Button type="button" variant="primary" size="sm" onClick={() => onAccept(r.followerId)}>
                {t('social.discoverPage.accept')}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => onDecline(r.followerId)}>
                {t('social.discoverPage.decline')}
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
