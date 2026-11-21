import React, { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.js';

export function InvitationRegistrationPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { loginWithData } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, password, invitationToken: token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invitation registration failed');
      loginWithData(data.token, data.user);
      navigate('/organizations', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invitation registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-bold">Accept your organization invitation</h1>
      <p className="mt-2 text-sm text-slate-500">Use the email address the organization administrator invited. This link expires after 24 hours.</p>
      {!token && <p role="alert" className="mt-4 text-sm text-rose-600">This registration link is missing its invitation token.</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">Full name<input required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-slate-800" /></label>
        <label className="block text-sm">Invited email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-slate-800" /></label>
        <label className="block text-sm">Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-slate-800" /></label>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={!token || busy} className="h-11 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-indigo-600">{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </main>
  );
}
