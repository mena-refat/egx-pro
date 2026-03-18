import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';

export function DiscountsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    adminApi
      .get('/discounts')
      .then((res) => setRows(res.data.data))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Discount Codes</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Value</th>
              <th className="px-3 py-2 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-slate-900/60">
                <td className="px-3 py-2">{d.code}</td>
                <td className="px-3 py-2">{d.type}</td>
                <td className="px-3 py-2">{d.value}</td>
                <td className="px-3 py-2">{d.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

