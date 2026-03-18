import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';

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
      <DataTable headers={['Email', 'Name', 'Plan', 'Created']}>
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
      </DataTable>
    </div>
  );
}

