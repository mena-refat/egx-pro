import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../ui/Button';
import { GoalCard } from './GoalCard';
import type { GoalRecord } from '../../../hooks/useGoals';

const noop = () => {};
const noopAsync = async () => {};

type Props = {
  goals: GoalRecord[];
  expanded: boolean;
  onToggle: () => void;
  locale: string;
  t: (key: string, opts?: object) => string;
};

export function GoalsCompletedSection({ goals, expanded, onToggle, locale, t }: Props) {
  if (goals.length === 0) return null;

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <span className="font-medium">
          {t('goals.completedSection')} ({goals.length})
        </span>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </Button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--border)]"
          >
            <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  t={t}
                  locale={locale}
                  completed
                  menuOpen={false}
                  onMenuToggle={noop}
                  onUpdateAmount={noop}
                  onEdit={noop}
                  onDelete={noopAsync}
                  onMarkComplete={noopAsync}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
