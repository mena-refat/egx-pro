import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './AnalysisResult.module.scss';

interface OutlookData {
  outlook: string;
  title: string;
  summary: string;
  reasons: string[];
  action: string;
}

interface OutlookCardProps {
  data: OutlookData;
  icon: React.ElementType;
  label: string;
  iconClass: string;
}

export function OutlookCard({ data, icon: Icon, label, iconClass }: OutlookCardProps) {
  const [open, setOpen] = useState(false);
  const outlookClass =
    data.outlook === 'إيجابي' ? styles.outlookPositive
    : data.outlook === 'سلبي' ? styles.outlookNegative
    : styles.outlookNeutral;

  return (
    <div className={styles.outlookCard}>
      <button type="button" onClick={() => setOpen(!open)} className={styles.outlookToggle}>
        <div className={styles.outlookLeft}>
          <div className={`${styles.outlookIconWrap} ${iconClass}`}>
            <Icon style={{ width: '1rem', height: '1rem' }} aria-hidden />
          </div>
          <div>
            <p className={styles.outlookLabel}>{label}</p>
            <p className={styles.outlookTitle}>
              {data.title || (data.summary && data.summary.length > 60 ? data.summary.slice(0, 60) + '...' : data.summary)}
            </p>
          </div>
        </div>
        <div className={styles.outlookRight}>
          <span className={`${styles.outlookBadge} ${outlookClass}`}>{data.outlook}</span>
          {open
            ? <ChevronUp style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)' }} aria-hidden />
            : <ChevronDown style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)' }} aria-hidden />}
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={styles.outlookBody}
        >
          {data.summary && data.summary.length > 60 && (
            <p className={styles.outlookSummary}>{data.summary}</p>
          )}
          {data.reasons?.length > 0 && (
            <ul className={styles.outlookReasons}>
              {data.reasons.map((r, i) => (
                <li key={i} className={styles.outlookReason}>
                  <span className={styles.outlookBullet}>•</span> {r}
                </li>
              ))}
            </ul>
          )}
          {data.action && (
            <div className={styles.actionBox}>
              <p className={styles.actionLabel}>💡 النصيحة</p>
              <p className={styles.actionText}>{data.action}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
