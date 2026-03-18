import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAdminStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi.post('/auth/login', { email, password });
      const { token, admin } = res.data.data;
      setAuth(token, admin);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'LOGIN_FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-slate-900/70 p-6 rounded-xl border border-slate-800"
      >
        <h1 className="text-lg font-semibold text-center">Borsa Admin Login</h1>
        {error && (
          <div className="text-sm text-rose-300 border border-rose-500/40 rounded px-3 py-2 bg-rose-950/40">
            {error}
          </div>
        )}
        <div className="space-y-1 text-sm">
          <label className="block text-slate-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <div className="space-y-1 text-sm">
          <label className="block text-slate-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium py-2 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

