import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Badge } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { Cpu, Plus, CheckCircle, AlertCircle, RefreshCw, Key, ShieldCheck } from 'lucide-react';

interface ProviderItem {
  id: string;
  provider: string;
  name: string;
  endpoint?: string;
  maskedApiKey?: string;
  isDefault: boolean;
  status: string;
  lastError?: string;
}

export function ApiManager() {
  const { accessToken } = useAuthStore();
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [configName, setConfigName] = useState('Primary');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const fetchProviders = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/providers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [accessToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setMessage({ type: 'error', text: 'You must log in under Settings before saving credentials.' });
      return;
    }

    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          provider: selectedProvider,
          name: configName,
          apiKey: apiKey || undefined,
          endpoint: endpoint || undefined,
          isDefault,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save provider');
      }

      setMessage({ type: 'success', text: `Saved ${selectedProvider} configuration with AES-256-GCM encryption!` });
      setApiKey('');
      fetchProviders();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      const res = await fetch(`/api/providers/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Connection test passed! Latency: ${data.latencyMs}ms` });
      } else {
        setMessage({ type: 'error', text: `Test failed: ${data.message} ${data.error ? `(${data.error})` : ''}` });
      }
      fetchProviders();
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-indigo-400" />
            Multi-Provider API Management Center
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            OpenAI, Anthropic Claude, Google Gemini, Groq, Mistral, Ollama & custom endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">AES-256-GCM Vault</Badge>
          <Badge variant="outline">Encrypted At Rest</Badge>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
              : 'border-rose-500/30 bg-rose-950/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Provider Entry & List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configure Provider</CardTitle>
            <CardDescription>Add or update an LLM API key</CardDescription>
          </CardHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="openai">OpenAI (GPT-4o, o1, o3)</option>
                <option value="gemini">Google Gemini (Flash, Pro)</option>
                <option value="anthropic">Anthropic Claude (Sonnet, Opus)</option>
                <option value="groq">Groq (Llama 3.3, Mixtral)</option>
                <option value="openrouter">OpenRouter (Unified)</option>
                <option value="mistral">Mistral (Large, Codestral)</option>
                <option value="deepseek">DeepSeek (V3, R1)</option>
                <option value="ollama">Ollama (Local LLMs)</option>
                <option value="custom">Custom OpenAI-Compatible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Configuration Name</label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">API Key</label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Custom Endpoint (Optional)</label>
              <input
                type="text"
                placeholder="https://..."
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="isDefault" className="text-xs text-neutral-300">Set as default provider</label>
            </div>

            <Button variant="primary" type="submit" size="sm" className="w-full gap-2 mt-2">
              <Plus className="h-4 w-4" />
              <span>Save Encrypted Provider</span>
            </Button>
          </form>
        </Card>

        {/* Existing Providers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-200">Active Configurations</h2>
            <Button variant="ghost" size="sm" onClick={fetchProviders} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {providers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1f2433] p-8 text-center text-xs text-neutral-400">
              <Key className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
              <p>No providers configured yet.</p>
              <p className="text-neutral-500 mt-1">Add your OpenAI, Gemini, or Claude API key to start generating projects.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {providers.map((p) => (
                <div key={p.id} className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-white capitalize">{p.provider}</span>
                      <p className="text-xs text-neutral-400">{p.name}</p>
                    </div>
                    {p.isDefault && <Badge variant="info">Default</Badge>}
                  </div>

                  <div className="rounded-md bg-[#090a0f] p-2 font-mono text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>Key: {p.maskedApiKey || 'None'}</span>
                    <Badge variant={p.status === 'CONNECTED' ? 'success' : p.status === 'ERROR' ? 'warning' : 'outline'}>
                      {p.status}
                    </Badge>
                  </div>

                  {p.lastError && (
                    <p className="text-[10px] text-rose-400 truncate">Error: {p.lastError}</p>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTest(p.id)}
                      disabled={testingId === p.id}
                      className="gap-1 text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 ${testingId === p.id ? 'animate-spin' : ''}`} />
                      <span>{testingId === p.id ? 'Testing...' : 'Test Connection'}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-300">
            <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
            <div>
              <span className="font-semibold">Security Vault Active:</span> Plaintext keys are never returned in network responses or written to browser storage. Keys are authenticated using AES-256-GCM with hardware-backed tags.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
