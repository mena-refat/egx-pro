import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    adminApi
      .get(`/users/${id}`)
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null));
  }, [id]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">User Detail</h1>
      <pre className="text-xs bg-slate-900/70 border border-slate-800 rounded-xl p-4 overflow-x-auto">
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}

