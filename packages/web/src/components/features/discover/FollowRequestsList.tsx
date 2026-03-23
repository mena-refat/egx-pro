import { useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PendingRequest } from './types';
import { Button } from '../../ui/Button';
import styles from '../../../pages/DiscoverPage.module.scss';

interface FollowRequestsListProps {
  requests: PendingRequest[];
  t: (k: string) => string;
  onAccept:  (followerId: string) => Promise<void> | void;
  onDecline: (followerId: string) => Promise<void> | void;
}

type PendingAction = 'accept' | 'decline';

/**
 * Renders pending follow-requests with per-item loading states.
 *
 * Each Accept / Decline button is individually disabled+loading while its
 * request is in-flight. While either action is pending for a given request,
 * BOTH buttons for that item are disabled — preventing contradictory actions.
 */
export function FollowRequestsList({
  requests,
  t,
  onAccept,
  onDecline,
}: FollowRequestsListProps) {
  const navigate = useNavigate();

  /**
   * Map of followerId → which action is currently in-flight for that item.
   * Using a Map (not a plain object) for O(1) lookup and clean immutable updates.
   */
  const [pending, setPending] = useState<Map<string, PendingAction>>(new Map());

  const handle = useCallback(
    async (id: string, action: PendingAction) => {
      // Drop call if this item is already being processed.
      if (pending.has(id)) return;

      setPending((prev) => new Map(prev).set(id, action));
      try {
        await (action === 'accept' ? onAccept(id) : onDecline(id));
      } finally {
        setPending((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [pending, onAccept, onDecline],
  );

  return (
    <ul className={styles.userList}>
      {requests.map((r) => {
        const pendingAction = pending.get(r.followerId);
        const anyPending    = pendingAction !== undefined;

        return (
          <li key={r.followerId} className={styles.userItem}>
            <div className={styles.requestRow}>
              {/* ── Profile link ─────────────────────────────────── */}
              <button
                type="button"
                onClick={() =>
                  r.follower.username && navigate(`/profile/${r.follower.username}`)
                }
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

              {/* ── Action buttons ───────────────────────────────── */}
              <div className={styles.requestActions}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={pendingAction === 'accept'}
                  disabled={anyPending}
                  onClick={() => void handle(r.followerId, 'accept')}
                >
                  {t('social.discoverPage.accept')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={pendingAction === 'decline'}
                  disabled={anyPending}
                  onClick={() => void handle(r.followerId, 'decline')}
                >
                  {t('social.discoverPage.decline')}
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
