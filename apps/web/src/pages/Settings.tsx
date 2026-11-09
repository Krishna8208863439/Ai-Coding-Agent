import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Badge } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, LogIn, UserPlus, LogOut, Key, CheckCircle, AlertCircle } from 'lucide-react';

export function Settings() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = tab === 'login' ? { email, password } : { name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuth(data.user, data.accessToken);
      setSuccess(tab === 'login' ? 'Successfully logged in!' : 'Account registered successfully!');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } finally {
      clearAuth();
      setSuccess('Logged out successfully.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="h-6 w-6 text-indigo-400" />
            Platform Authentication & Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Argon2id password hashing, rotating JWT refresh tokens, and audit logging.
          </p>
        </div>
        <Badge variant={user ? 'success' : 'outline'}>
          {user ? 'Authenticated' : 'Guest'}
        </Badge>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Active User Card */}
      {user ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <Badge variant="info">Role: {user.role}</Badge>
            </div>
          </CardHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-[#1f2433] bg-[#090a0f] p-4 font-mono text-xs text-neutral-400">
              <span className="text-neutral-500">Access Token (in-memory):</span>
              <p className="truncate text-indigo-300 mt-1">{accessToken}</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Session secured with rotating refresh token</span>
              </div>
              <Button variant="danger" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Auth Form Card */
        <Card>
          {/* Tabs */}
          <div className="flex border-b border-[#1f2433] mb-6">
            <button
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Log In</span>
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Register</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ada Lovelace"
                  className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@nexora.ai"
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Password {tab === 'register' && <span className="text-neutral-500">(min. 8 characters)</span>}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              {loading ? 'Processing...' : tab === 'login' ? 'Log In' : 'Create Account'}
            </Button>
          </form>
        </Card>
      )}

      {/* Security Architecture Reference */}
      <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200 mb-3">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Phase 2 Security Guarantees</span>
        </div>
        <ul className="text-xs space-y-1.5 text-neutral-400">
          <li>• <strong className="text-neutral-300">Argon2id:</strong> Memory-hard key derivation resisting GPU/ASIC attacks</li>
          <li>• <strong className="text-neutral-300">Short-Lived Access Tokens:</strong> 15-minute JWT stored purely in memory</li>
          <li>• <strong className="text-neutral-300">Rotating Refresh Tokens:</strong> 7-day tokens, hashed via SHA-256 before storage</li>
          <li>• <strong className="text-neutral-300">Reuse Detection:</strong> Presentation of a revoked token invalidates all sessions</li>
          <li>• <strong className="text-neutral-300">HTTP-Only Cookies:</strong> SameSite=Strict cookies inaccessible to JS</li>
          <li>• <strong className="text-neutral-300">Append-Only Audit Log:</strong> Every auth attempt, success, and failure is recorded</li>
        </ul>
      </div>
    </div>
  );
}
