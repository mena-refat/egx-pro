import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CARD_DURATION_MS = 4000;
const ENTER_DURATION_S = 0.3;
const EXIT_DURATION_S = 0.3;

interface AchievementCongratsCardProps {
  key?: string;
  title: string;
  shortDescription: string;
  onComplete: () => void;
  isExiting?: boolean;
}

export function AchievementCongratsCard({
  title,
  shortDescription,
  onComplete,
  isExiting = false,
}: AchievementCongratsCardProps) {
  const { t } = useTranslation('common');
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / CARD_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: ENTER_DURATION_S }}
      >
        {/* Overlay — النقر برا الكارت يعدّ تخطي ويظهر التالي */}
        <div
          className="absolute inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
          aria-hidden
          onClick={onComplete}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onComplete(); }}
        />

        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl text-[var(--text-primary)]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            duration: isExiting ? EXIT_DURATION_S : ENTER_DURATION_S,
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-[var(--brand)]">
              <Trophy className="w-16 h-16" strokeWidth={1.5} />
              <Sparkles className="w-8 h-8" strokeWidth={1.5} />
            </div>

            <p className="text-xl font-bold text-[var(--brand)]">
              {t('achievements.congrats')}
            </p>

            <p className="text-sm text-[var(--text-muted)]">
              {t('achievements.newAchievement')}
            </p>

            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {title}
            </p>

            <p className="text-sm text-[var(--text-muted)]">
              {shortDescription}
            </p>

            {/* Progress bar: يبدأ ممتلئ ويفرغ خلال 4 ثواني */}
            <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex justify-end">
              <motion.div
                className="h-full rounded-full bg-[var(--brand)] min-w-0"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          </div>
        </motion.div>
    </motion.div>
  );
}
