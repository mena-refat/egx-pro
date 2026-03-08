import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';

const STORAGE_KEY = 'delayNoticeShown';

export default function DelayNotice({
  showWhenStockPage,
  isPro,
}: {
  showWhenStockPage: boolean;
  isPro: boolean;
}) {
  const { t } = useTranslation('common');
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, [showWhenStockPage]);

  const visible = showWhenStockPage && !isPro && !dismissed;

  const handleGotIt = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-subscription'));
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-bg)] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[var(--warning)]" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-200">{t('delay.noticeTitle')}</p>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('delay.noticeBody')}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button type="button" onClick={handleUpgrade} size="sm">
            {t('delay.upgradeToPro')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleGotIt} size="sm">
            {t('delay.gotIt')}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
