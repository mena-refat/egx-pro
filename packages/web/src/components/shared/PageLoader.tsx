import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PageLoader.module.scss';

const PageLoader = memo(function PageLoader() {
  const { t } = useTranslation('common');
  return (
    <div className={styles.root} role="status" aria-label={t('common.loading')}>
      <div className={styles.inner}>
        <div className={styles.spinner} aria-hidden />
        <p className={styles.text}>{t('common.loading')}</p>
      </div>
    </div>
  );
});

export default PageLoader;
