import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';

export function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);

  useEffect(() => {
    adminApi
      .get('/admins')
      .then((res) => setAdmins(res.data.data))
      .catch(() => setAdmins([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admins</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-slate-900/60">
                <td className="px-3 py-2">{a.email}</td>
                <td className="px-3 py-2">{a.fullName}</td>
                <td className="px-3 py-2">{a.role}</td>
                <td className="px-3 py-2">{a.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

