/**
 * Balanced Glossy Graphite Design System Implementation
 * Component: InvitationRegistrationPage
 * Standardized with semantic design system tokens and shared UI primitives.
 */

import React, { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  FormField,
  Label,
  Alert,
  toast,
} from '../../../client/components/ui/index.js';

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
      toast.success('auth.invitation_accepted');
      loginWithData(data.token, data.user);
      navigate('/organizations', { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Invitation registration failed';
      setError(msg);
      toast.fromError(err, 'Invitation registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto mt-16 w-full max-w-md p-4">
      <Card specular className="p-2 sm:p-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Accept your organization invitation</CardTitle>
          <CardDescription className="mt-2 text-sm">
            Use the email address the organization administrator invited. This link expires after 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token && (
            <Alert variant="destructive" className="mb-4">
              This registration link is missing its invitation token.
            </Alert>
          )}
          <form onSubmit={submit} className="space-y-4">
            <FormField>
              <Label htmlFor="invitation-fullname">Full name</Label>
              <Input
                id="invitation-fullname"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </FormField>
            <FormField>
              <Label htmlFor="invitation-email">Invited email</Label>
              <Input
                id="invitation-email"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </FormField>
            <FormField>
              <Label htmlFor="invitation-password">Password</Label>
              <Input
                id="invitation-password"
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FormField>
            {error && (
              <Alert variant="destructive" className="mt-2">
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!token || busy}
              isLoading={busy}
              className="mt-2 cursor-pointer shadow-xs"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
