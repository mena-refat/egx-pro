import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';

type UserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  plan: string;
  createdAt: string;
};

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    adminApi
      .get('/users', { params: { page: 1, limit: 50 } })
      .then((res) => setUsers(res.data.data.users))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/60">
                <td className="px-3 py-2">
                  <Link to={`/users/${u.id}`} className="text-emerald-300 hover:underline">
                    {u.email ?? '—'}
                  </Link>
                </td>
                <td className="px-3 py-2">{u.fullName ?? u.username ?? '—'}</td>
                <td className="px-3 py-2">{u.plan}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

