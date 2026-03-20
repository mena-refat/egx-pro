import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../ui/Button';

interface CompareFeatureModalProps {
  featureKey: string;
  onClose: () => void;
  t: (k: string) => string;
}

export function CompareFeatureModal({ featureKey, onClose, t }: CompareFeatureModalProps) {
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-explain-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="feature-explain-title" className="text-lg font-bold text-[var(--text-primary)] mb-3">
            {t(`billing.${featureKey}`)}
          </h3>
          <p className="text-[var(--text-secondary)] text-[15px] leading-[1.6]">
            {t(`billing.${featureKey}Desc`)}
          </p>
          <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onClose}>
            {t('billing.compareFeatureClose')}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
