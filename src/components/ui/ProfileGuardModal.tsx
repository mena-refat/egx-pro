import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

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
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
