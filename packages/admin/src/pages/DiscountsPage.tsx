import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_MIN = 18;
const CODE_MAX = 30;
const CODE_REGEX = /^[A-Z0-9]{18,30}$/;
const generateCode = () =>
  Array.from({ length: 20 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

function validateCode(code: string): string | null {
  if (code.length < CODE_MIN) return `الكود لازم يكون ${CODE_MIN} حرف على الأقل`;
  if (code.length > CODE_MAX) return `الكود لازم يكون ${CODE_MAX} حرف على الأكثر`;
  if (!CODE_REGEX.test(code)) return 'الكود يحتوي على أحرف غير مسموح بها (حروف إنجليزية وأرقام فقط)';
  return null;
}

export default function DiscountsPage() {
  const { t } = useTranslation();
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [delId, setDelId]     = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '' });
  const [codeError, setCodeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.get('/discounts'); setRows(r.data.data?.discounts ?? []); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    const effectiveValue = form.type === 'full' ? 100 : Number(form.value);
    if (!form.code || !form.maxUses || (form.type !== 'full' && !form.value)) return;
    const err = validateCode(form.code.toUpperCase());
    if (err) { setCodeError(err); return; }
    setSaving(true);
    try {
      await adminApi.post('/discounts', {
        code: form.code.toUpperCase(),
        type: form.type,
        value: effectiveValue,
        maxUses: Number(form.maxUses),
        expiresAt: form.expiresAt || undefined,
      });
      setModal(false);
      setForm({ code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '' });
      setCodeError(null);
      await load();
    } finally { setSaving(false); }
  };

  // Only allow non-negative integers
  const handleIntInput = (key: 'value' | 'maxUses', raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setForm((p) => ({ ...p, [key]: cleaned }));
  };

  const isCreateDisabled =
    saving ||
    !form.code ||
    !form.maxUses ||
    (form.type !== 'full' && !form.value) ||
    !!validateCode(form.code.toUpperCase());

  const handleToggleActive = async (id: string, active: boolean) => {
    await adminApi.patch(`/discounts/${id}`, { active: !active });
    await load();
  };

  const handleDelete = async () => {
    if (!delId) return;
    setSaving(true);
    try { await adminApi.delete(`/discounts/${delId}`); setDelId(null); await load(); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('discounts.title')}</h1>
          <p className="text-sm text-slate-500">{rows.length} {t('discounts.codes')}</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">
          <Plus size={14} /> {t('discounts.newCode')}
        </button>
      </div>

      <DataTable
        headers={[t('discounts.code'), t('discounts.type'), t('discounts.value'), t('discounts.used'), t('discounts.expires'), t('discounts.active'), '']}
        loading={loading}
        rowCount={rows.length}
        empty={t('discounts.noCodes')}
        children={(
          <>
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-sm font-bold text-emerald-400">{d.code}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{d.type}</td>
                <td className="px-4 py-3 text-sm text-white">
                  {d.type === 'percentage' ? `${d.value}%` : `${d.value} EGP`}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">
                  {d.usedCount}
                  {d.maxUses ? `/${d.maxUses}` : ''}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '∞'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(d.id, d.active)}
                    className={`transition-colors ${
                      d.active
                        ? 'text-emerald-400 hover:text-slate-400'
                        : 'text-slate-600 hover:text-emerald-400'
                    }`}
                  >
                    {d.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDelId(d.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </>
        )}
      />

      {/* Create modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={t('discounts.newDiscountCode')}
        width="max-w-sm"
        children={(
          <div className="space-y-3">

            {/* Code + Generate */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                {t('discounts.code')}
                <span className="text-slate-600 ml-1">(18–30 حرف وأرقام إنجليزية)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="PROMO20SUMMER2024AB"
                  value={form.code}
                  maxLength={30}
                  onChange={(e) => {
                    const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30);
                    setForm((p) => ({ ...p, code: sanitized }));
                    setCodeError(validateCode(sanitized));
                  }}
                  className={`flex-1 px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white font-mono focus:outline-none transition-colors ${
                    codeError && form.code ? 'border-red-500/60 focus:border-red-500' : 'border-white/[0.08] focus:border-emerald-500/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const code = generateCode();
                    setForm((p) => ({ ...p, code }));
                    setCodeError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-slate-300 transition-all whitespace-nowrap"
                  title={t('discounts.generate')}
                >
                  <RefreshCw size={12} />
                  {t('discounts.generate')}
                </button>
              </div>
              {form.code && (
                <div className="flex items-center justify-between mt-1">
                  {codeError ? (
                    <p className="text-xs text-red-400">{codeError}</p>
                  ) : (
                    <p className="text-xs text-emerald-500">✓ الكود صالح</p>
                  )}
                  <span className="text-xs text-slate-600">{form.code.length}/30</span>
                </div>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('discounts.type')}</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, value: e.target.value === 'full' ? '' : p.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="percentage">{t('discounts.percentage')}</option>
                <option value="fixed">{t('discounts.fixed')}</option>
                <option value="full">{t('discounts.full')}</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('discounts.value')}</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={form.type === 'full' ? '100' : '20'}
                  value={form.type === 'full' ? '100' : form.value}
                  disabled={form.type === 'full'}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault(); }}
                  onChange={(e) => handleIntInput('value', e.target.value)}
                  className={`w-full px-3 py-2 pe-14 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50 transition-all ${
                    form.type === 'full' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                  {form.type === 'percentage' || form.type === 'full' ? '%' : 'EGP'}
                </span>
              </div>
            </div>

            {/* Max Uses (required) */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('discounts.maxUsesRequired')}</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="100"
                value={form.maxUses}
                onKeyDown={(e) => { if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault(); }}
                onChange={(e) => handleIntInput('maxUses', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Expires At (optional) */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('discounts.expiresAtOptional')}</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-slate-400">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreateDisabled}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {saving ? t('common.creating') : t('common.create')}
              </button>
            </div>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!delId} title={t('discounts.deleteTitle')}
        message={t('discounts.deleteMsg')}
        confirmLabel={t('common.delete')} danger loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}
