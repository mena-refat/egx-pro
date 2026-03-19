import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GraduationCap, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import type { LearnCard } from '../../../types';
import styles from './LearnSection.module.scss';

function LearnCardItem({ card, index }: { card: LearnCard; index: number; key?: React.Key }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={styles.card}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={styles.cardBtn}
      >
        <span className={styles.emoji}>{card.emoji || '📚'}</span>
        <div className={styles.cardBody}>
          <p className={styles.cardTerm}>{card.term}</p>
          <p className={styles.cardSimple}>{card.simple}</p>
        </div>
        {expanded ? (
          <ChevronUp className={styles.chevron} aria-hidden />
        ) : (
          <ChevronDown className={styles.chevron} aria-hidden />
        )}
      </button>

      {expanded && (
        <div className={styles.expanded} aria-hidden={false}>
          <div className={styles.expandedInner}>
            {card.detail && (
              <p className={styles.detail}>{card.detail}</p>
            )}
            {card.inThisStock && (
              <div className={styles.inThisBox}>
                <Lightbulb className={styles.inThisIcon} aria-hidden />
                <p className={styles.inThisText}>
                  <span className={styles.inThisLabel}>في السهم ده: </span>
                  {card.inThisStock}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function LearnSection({ cards }: { cards: LearnCard[] }) {
  const { t } = useTranslation('common');
  const [showAll, setShowAll] = useState(false);

  if (!cards || cards.length === 0) return null;

  const displayed = showAll ? cards : cards.slice(0, 2);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h4 className={styles.title}>
            <GraduationCap className={styles.titleIcon} aria-hidden />
            {t('learn.title', 'اتعلّم — إيه المصطلحات دي؟')}
          </h4>
          <p className={styles.subtitle}>
            {t('learn.subtitle', 'مصطلحات وردت في التقرير — شرحها بلغة بسيطة من عندنا، بدون أي تكلفة إضافية.')}
          </p>
        </div>
        {cards.length > 2 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className={styles.toggleBtn}
          >
            {showAll ? t('learn.showLess', 'أقل') : t('learn.showAllCount', { count: cards.length })}
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {displayed.map((card, i) => (
          <LearnCardItem key={card.term || i} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
