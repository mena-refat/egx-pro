import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import styles from './AnalysisLoadingState.module.scss';

const PROGRESS_DURATION_MS = 70000; // يصل لـ 90% خلال ~70 ثانية
const PROGRESS_CAP = 90;
const MESSAGE_INTERVAL_MS = 5000;

const MESSAGES_RECOMMENDATIONS = [
  'جاري تحليل المحفظة والملف الشخصي...',
  'جاري إعداد التوصيات المناسبة لك...',
  'شوية وهنخلص...',
  'Claude بيجهّز التوصيات...',
];

const MESSAGES_ANALYZE = [
  'جاري جمع بيانات السهم...',
  'جاري التحليل الفني والأساسي...',
  'شوية وهنخلص...',
  'Claude بيجهّز التقرير...',
];

const MESSAGES_COMPARE = [
  'جاري جمع بيانات السهمين...',
  'جاري المقارنة والتحليل...',
  'شوية وهنخلص...',
  'Claude بيجهّز المقارنة...',
];

export type AnalysisLoadingVariant = 'recommendations' | 'analyze' | 'compare';

const MESSAGES_MAP: Record<AnalysisLoadingVariant, string[]> = {
  recommendations: MESSAGES_RECOMMENDATIONS,
  analyze: MESSAGES_ANALYZE,
  compare: MESSAGES_COMPARE,
};

export interface AnalysisLoadingStateProps {
  loading: boolean;
  variant: AnalysisLoadingVariant;
}

export function AnalysisLoadingState({ loading, variant }: AnalysisLoadingStateProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const startRef = useRef<number | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading) {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      if (messageRef.current) {
        clearInterval(messageRef.current);
        messageRef.current = null;
      }
      startRef.current = null;
      setProgress(0);
      setMessageIndex(0);
      return;
    }

    startRef.current = Date.now();
    setProgress(0);
    setMessageIndex(0);

    progressRef.current = setInterval(() => {
      const start = startRef.current ?? Date.now();
      const elapsed = Date.now() - start;
      const p = Math.min(PROGRESS_CAP, (elapsed / PROGRESS_DURATION_MS) * PROGRESS_CAP);
      setProgress(Math.round(p));
    }, 500);

    const messages = MESSAGES_MAP[variant];
    messageRef.current = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (messageRef.current) clearInterval(messageRef.current);
    };
  }, [loading, variant]);

  if (!loading) return null;

  const messages = MESSAGES_MAP[variant];

  return (
    <div className={styles.card} role="status" aria-live="polite" aria-label="جاري التحليل">
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <Sparkles className={styles.icon} aria-hidden />
        </div>
        <div>
          <h3 className={styles.title}>جاري التحليل</h3>
          <p className={styles.status}>{messages[messageIndex]}</p>
        </div>
      </div>
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.progressLabel}>
          <span>التقدّم</span>
          <span className={styles.percent}>{progress}%</span>
        </div>
      </div>
      <p className={styles.hint}>قد يستغرق دقيقة أو دقيقتين — لا تغلق الصفحة حتى يكتمل التحليل</p>
    </div>
  );
}
