import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Search,
  Eye,
  Wrench,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Key,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
} from 'lucide-react';
import { ModelInfo, LLMProviderType } from '@nexora/shared';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

interface ProviderConfigItem {
  id: string;
  provider: LLMProviderType;
  name: string;
  endpoint?: string;
  maskedApiKey?: string;
  isDefault: boolean;
  status: 'CONNECTED' | 'ERROR' | 'UNVERIFIED';
  lastError?: string;
}

export function ModelLibrary() {
  const { accessToken } = useAuthStore();
  const { setSelectedModel, setSelectedProvider } = useChatStore();

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderConfigItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('all');
  const [filterTools, setFilterTools] = useState(false);
  const [filterVision, setFilterVision] = useState(false);
  const [activeTab, setActiveTab] = useState<'models' | 'providers'>('models');
  const [loading, setLoading] = useState(false);

  // Add Provider State
  const [newProvider, setNewProvider] = useState<LLMProviderType>('openai');
  const [newName, setNewName] = useState('Primary');
  const [newKey, setNewKey] = useState('');
  const [newEndpoint, setNewEndpoint] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      const res = await fetch(`/api/providers/models?provider=${selectedProviderFilter}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch {}
  };

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
    fetchModels();
  }, [selectedProviderFilter]);

  useEffect(() => {
    fetchProviders();
  }, [accessToken]);

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      alert('Please log in under Settings before configuring providers.');
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
          provider: newProvider,
          name: newName,
          apiKey: newKey || undefined,
          endpoint: newEndpoint || undefined,
          isDefault: true,
        }),
      });

      if (res.ok) {
        setNewKey('');
        setNewEndpoint('');
        fetchProviders();
        alert('AI Provider credentials encrypted & saved.');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Validation failed'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleTestProvider = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/providers/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      alert(`Test Result: ${data.success ? 'CONNECTED' : 'FAILED'} — ${data.message || data.error}`);
      fetchProviders();
    } finally {
      setTestingId(null);
    }
  };

  const handleSelectDefaultModel = (model: ModelInfo) => {
    setSelectedModel(model.id);
    setSelectedProvider(model.provider);
    alert(`Switched active agent model to: ${model.name} (${model.provider})`);
  };

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchesTools = !filterTools || m.supportsTools;
    const matchesVision = !filterVision || m.supportsVision;
    return matchesSearch && matchesTools && matchesVision;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] text-neutral-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-[#252525] bg-[#1a1a1a] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-800/40 rounded-lg text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              AI Provider Manager & Model Registry
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                AES-256-GCM Vault
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400">
              Configure LLM API keys, test streaming connections, and choose active models for autonomous agents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#1c1c1c] p-1 border border-[#2e2e2e] rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'models' ? 'bg-[#2a2a2a] text-cyan-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Model Library ({models.length})
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'providers' ? 'bg-[#2a2a2a] text-cyan-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Connected Providers ({providers.length})
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'providers' ? (
          /* Provider Credentials & Vault Configuration */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1 bg-[#1c1c1c] border border-[#2b2b2b] rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> Connect AI Provider
              </h2>

              <form onSubmit={handleSaveProvider} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Provider Type</label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as LLMProviderType)}
                    className="w-full bg-[#141414] border border-[#303030] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="groq">Groq LPU</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="ollama">Ollama (Self-Hosted)</option>
                    <option value="custom">Custom OpenAI-Compatible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Configuration Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#141414] border border-[#303030] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">API Key / Secret</label>
                  <input
                    type="password"
                    placeholder="Encrypted with AES-256-GCM"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full bg-[#141414] border border-[#303030] rounded px-3 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Custom Endpoint (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://api.openai.com/v1"
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    className="w-full bg-[#141414] border border-[#303030] rounded px-3 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition-colors"
                >
                  Save & Encrypt Credentials
                </button>
              </form>
            </div>

            {/* Configured Providers List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                Configured Provider Connections
              </h2>

              {providers.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#2d2d2d] rounded-xl text-neutral-500 text-xs">
                  No AI providers configured yet. Add your Google Gemini, OpenAI, or Groq API key to enable streaming responses.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-neutral-100 text-xs">{p.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#252525] text-cyan-400 font-mono">
                            {p.provider}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-neutral-400 font-mono mb-3">
                          <div>Key: {p.maskedApiKey || 'None'}</div>
                          <div>Status: {p.status}</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
                        <button
                          onClick={() => handleTestProvider(p.id)}
                          disabled={testingId === p.id}
                          className="px-3 py-1 bg-[#252525] hover:bg-[#303030] border border-[#383838] rounded text-[11px] text-cyan-400 font-medium"
                        >
                          {testingId === p.id ? 'Testing...' : 'Test Connection'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Model Catalog */
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search models (e.g. gpt-4o, claude, gemini)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedProviderFilter}
                  onChange={(e) => setSelectedProviderFilter(e.target.value)}
                  className="bg-[#1b1b1b] border border-[#2e2e2e] rounded-md px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Providers</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="groq">Groq</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
            </div>

            {/* Model Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#1c1c1c] border border-[#2c2c2c] hover:border-cyan-800/50 rounded-xl p-4 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-neutral-100">{m.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#282828] text-cyan-400 font-mono">
                        {m.provider}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-400 space-y-1 mb-4 font-mono">
                      <div>ID: {m.id}</div>
                      <div>Context: {(m.contextWindow / 1000).toFixed(0)}k tokens</div>
                      <div className="flex items-center gap-2 pt-1 text-[10px]">
                        {m.supportsTools && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            Tool Calling
                          </span>
                        )}
                        {m.supportsVision && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
                            Vision
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectDefaultModel(m)}
                    className="w-full py-1.5 text-xs bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 rounded font-medium transition-colors"
                  >
                    Select for AI Agent
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
