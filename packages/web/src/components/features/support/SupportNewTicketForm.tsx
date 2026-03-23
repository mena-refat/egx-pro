import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, Send } from 'lucide-react';
import api from '../../../lib/api';
import { TicketCategory, CATEGORY_CFG } from './support.types';

interface SupportNewTicketFormProps {
  isAr: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const CATEGORIES: TicketCategory[] = ['BUG', 'INQUIRY', 'ACCOUNT', 'PAYMENT', 'FEATURE', 'OTHER'];

export function SupportNewTicketForm({ isAr, onCancel, onSuccess }: SupportNewTicketFormProps) {
  const { t } = useTranslation('common');
  const [category,   setCategory]   = useState<TicketCategory | null>(null);
  const [subject,    setSubject]    = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const canSubmit = !!category && subject.trim().length > 0 && message.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/support', { subject: subject.trim(), message: message.trim(), category });
      onSuccess();
    } catch {
      setError(t('support.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
          <LifeBuoy className="w-4 h-4 text-[var(--brand)]" />
        </div>
        <h2 className="font-semibold text-[var(--text-primary)]">{t('support.newTicket')}</h2>
      </div>

      <div className="p-5 space-y-5">

        {/* Category selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {isAr ? 'نوع المشكلة' : 'Issue type'}
            <span className="text-[var(--danger)] ms-0.5">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CFG[cat];
              const Icon = cfg.icon;
              const selected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-start transition-all duration-150 ${
                    selected
                      ? 'border-[var(--brand)] bg-[var(--brand)]/8 ring-1 ring-[var(--brand)]/30 font-semibold text-[var(--text-primary)]'
                      : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    selected ? cfg.color : 'bg-[var(--bg-card-hover)]'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs leading-tight">
                    {isAr ? cfg.label_ar : cfg.label_en}
                  </span>
                  {selected && (
                    <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">{t('support.subjectLabel')}</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('support.subjectPlaceholder')}
            maxLength={120}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 transition"
          />
        </div>

        {/* Message */}
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

        {/* Footer */}
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
            disabled={submitting || !canSubmit}
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
