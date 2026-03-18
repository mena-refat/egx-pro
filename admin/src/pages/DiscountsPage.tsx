import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function DiscountsPage() {
  const { t } = useTranslation();
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [delId, setDelId]     = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.get('/discounts'); setRows(r.data.data ?? []); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.code || !form.value) return;
    setSaving(true);
    try {
      await adminApi.post('/discounts', {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setModal(false);
      setForm({ code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '' });
      await load();
    } finally { setSaving(false); }
  };

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
            {[
              { label: t('discounts.code'),    key: 'code',      type: 'text',           placeholder: 'PROMO20' },
              { label: t('discounts.value'),   key: 'value',     type: 'number',         placeholder: '20' },
              { label: t('discounts.maxUses'), key: 'maxUses',   type: 'number',         placeholder: t('discounts.unlimited') },
              { label: t('discounts.expiresAt'), key: 'expiresAt', type: 'datetime-local', placeholder: '' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('discounts.type')}</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="percentage">{t('discounts.percentage')}</option>
                <option value="fixed">{t('discounts.fixed')}</option>
                <option value="full">{t('discounts.full')}</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 text-sm text-slate-400"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.code || !form.value}
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
