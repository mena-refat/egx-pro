import { Users, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardEntry } from './types';
import styles from '../../../pages/DiscoverPage.module.scss';

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
  t: (k: string) => string;
}

export function LeaderboardSection({ entries, t }: LeaderboardSectionProps) {
  const navigate = useNavigate();
  if (entries.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Trophy className={styles.sectionIcon} aria-hidden />
        {t('social.discoverPage.leaderboardTitle')}
      </h2>
      <div className={styles.leaderboard}>
        {entries.map((user, i) => (
          <button
            key={user.username}
            type="button"
            className={styles.leaderRow}
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            <span className={`${styles.leaderRank} ${i < 3 ? styles[`rank${i + 1}` as keyof typeof styles] : ''}`}>
              {i + 1}
            </span>
            <div className={styles.leaderAvatar}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  width={36}
                  height={36}
                  className={styles.avatarImg}
                  loading="lazy"
                />
              ) : (
                <Users style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)' }} aria-hidden />
              )}
            </div>
            <div className={styles.leaderInfo}>
              <span className={styles.leaderName}>@{user.username}</span>
              <span className={styles.leaderStats}>
                {user.accuracyRate}% {t('discover.accuracy')} · {user.totalPredictions} {t('discover.predictions')}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
