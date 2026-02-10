'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      });
      if (res.ok) {
        window.location.href = '/admin-portal-99';
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Invalid password');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">ADMIN LOGIN</h1>
          <p className="text-slate-500 text-sm mb-6">Enter the admin password to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={loading}
              className="rounded-xl"
              suppressHydrationWarning
            />
            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}
            <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
              {loading ? 'Checking…' : 'Log in'}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center">
          <Link href="/" className="text-xs font-bold text-slate-500 hover:text-primary">
            ← Back to editor
          </Link>
        </p>
      </div>
    </div>
  );
}
