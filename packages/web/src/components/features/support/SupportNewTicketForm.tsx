import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, Send } from 'lucide-react';
import api from '../../../lib/api';

interface SupportNewTicketFormProps {
  isAr: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SupportNewTicketForm({ isAr, onCancel, onSuccess }: SupportNewTicketFormProps) {
  const { t } = useTranslation('common');
  const [subject,    setSubject]    = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/support', { subject: subject.trim(), message: message.trim() });
      onSuccess();
    } catch {
      setError(t('support.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
          <LifeBuoy className="w-4 h-4 text-[var(--brand)]" />
        </div>
        <h2 className="font-semibold text-[var(--text-primary)]">{t('support.newTicket')}</h2>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.subjectLabel')}</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('support.subjectPlaceholder')}
            maxLength={120}
            required
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.messageLabel')}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('support.messagePlaceholder')}
            rows={6}
            maxLength={2000}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 resize-none transition"
          />
          <p className="text-xs text-[var(--text-muted)] text-end">{message.length} / 2000</p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال' : 'Send')}
          </button>
        </div>
      </div>
    </form>
  );
}
