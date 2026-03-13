import React from 'react';
import { Button } from './Button';
import styles from './ProfileRequiredCard.module.scss';

export interface ProfileRequiredCardProps {
  title: string;
  body: string;
  goToProfileLabel: string;
  onGoToProfile: () => void;
}

export function ProfileRequiredCard({
  title,
  body,
  goToProfileLabel,
  onGoToProfile,
}: ProfileRequiredCardProps) {
  return (
    <div className={styles.card} role="alert">
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      <Button variant="primary" onClick={onGoToProfile} className={styles.btn}>
        {goToProfileLabel}
      </Button>
    </div>
  );
}
