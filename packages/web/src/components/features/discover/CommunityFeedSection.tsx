import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedPrediction } from './types';
import styles from '../../../pages/DiscoverPage.module.scss';

interface CommunityFeedSectionProps {
  predictions: FeedPrediction[];
  t: (k: string) => string;
}

export function CommunityFeedSection({ predictions, t }: CommunityFeedSectionProps) {
  const navigate = useNavigate();
  if (predictions.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <TrendingUp className={styles.sectionIcon} aria-hidden />
        {t('social.discoverPage.communityFeedTitle')}
      </h2>
      <div className={styles.feedList}>
        {predictions.map((p) => (
          <div key={p.id} className={styles.feedItem}>
            <div className={styles.feedHeader}>
              <button
                type="button"
                onClick={() => p.user?.username && navigate(`/profile/${p.user.username}`)}
                className={styles.feedUser}
              >
                @{p.user?.username ?? '-'}
              </button>
              <span className={`${styles.feedDirection} ${p.direction === 'UP' ? styles.feedUp : styles.feedDown}`}>
                {p.direction === 'UP'
                  ? t('social.discoverPage.feedDirectionUp')
                  : t('social.discoverPage.feedDirectionDown')}
              </span>
            </div>
            <div className={styles.feedBody}>
              <span className={styles.feedTicker}>{p.ticker}</span>
              <span className={styles.feedTarget}>
                {t('social.discoverPage.feedTarget', { price: p.targetPrice })}
              </span>
            </div>
            {p.reason && <p className={styles.feedReason}>{p.reason}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
