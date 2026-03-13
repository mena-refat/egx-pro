import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './ProfileGuardModal.module.scss';

interface ProfileGuardModalProps {
  show: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
  title: string;
  body: string;
  goToProfileLabel: string;
  closeLabel: string;
}

export function ProfileGuardModal({
  show,
  onClose,
  onGoToProfile,
  title,
  body,
  goToProfileLabel,
  closeLabel,
}: ProfileGuardModalProps) {
  return (
    <Modal isOpen={show} onClose={onClose} title={title} size="sm">
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onGoToProfile}>
          {goToProfileLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </Modal>
  );
}
