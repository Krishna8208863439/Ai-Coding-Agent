import React, { useState, useEffect } from 'react';
import {
  Network,
  Plus,
  Play,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  FileCode2,
  Terminal,
  Activity,
  Settings,
  Cpu,
  RefreshCw,
  X,
  Code,
  FileJson,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  ApiConfigurationSummary,
  ApiAuthType,
  HttpMethod,
} from '@nexora/shared';

type ManagerTab =
  | 'all'
  | 'ai_providers'
  | 'custom'
  | 'connected'
  | 'templates'
  | 'usage'
  | 'logs'
  | 'settings';

const API_CATEGORIES = [
  'All Categories',
  'AI and LLM APIs',
  'Developer APIs',
  'Database APIs',
  'Authentication APIs',
  'Payment APIs',
  'Cloud APIs',
  'Storage APIs',
  'Maps and Location APIs',
  'Weather APIs',
  'Communication APIs',
  'Analytics APIs',
  'Machine Learning APIs',
  'Custom APIs',
];

export function ApiManager() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ManagerTab>('all');
  const [apis, setApis] = useState<ApiConfigurationSummary[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpenApiModalOpen, setIsOpenApiModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isTestingLive, setIsTestingLive] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom APIs');
  const [baseUrl, setBaseUrl] = useState('');
  const [environment, setEnvironment] = useState<'DEVELOPMENT' | 'PRODUCTION'>('DEVELOPMENT');
  const [authType, setAuthType] = useState<ApiAuthType>('NONE');
  const [secret, setSecret] = useState('');
  const [headerName, setHeaderName] = useState('');
  const [queryParamKey, setQueryParamKey] = useState('');
  const [prefix, setPrefix] = useState('');
  const [endpointPath, setEndpointPath] = useState('/');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [rawHeaders, setRawHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [rawBody, setRawBody] = useState('');
  const [openApiSpecInput, setOpenApiSpecInput] = useState('');

  // Fetch APIs
  const fetchApis = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/universal-apis', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApis(data.apis || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/universal-apis/templates', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {}
  };

  // Fetch Usage
  const fetchUsage = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/universal-apis/usage', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsageStats(data);
      }
    } catch {}
  };

  // Fetch Logs
  const fetchLogs = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/universal-apis/logs', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchApis();
    fetchTemplates();
    fetchUsage();
    fetchLogs();
  }, [accessToken]);

  // Handle Save
  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      alert('Please log in first.');
      return;
    }

    let parsedHeaders = undefined;
    try {
      if (rawHeaders.trim()) {
        parsedHeaders = JSON.parse(rawHeaders);
      }
    } catch {
      alert('Invalid JSON format in custom headers.');
      return;
    }

    const payload = {
      name,
      providerName: providerName || undefined,
      description: description || undefined,
      category,
      baseUrl,
      environment,
      authType,
      secret: secret || undefined,
      headerName: headerName || undefined,
      queryParamKey: queryParamKey || undefined,
      prefix: prefix || undefined,
      customHeaders: parsedHeaders,
      endpoints: [
        {
          name: `${method} ${endpointPath}`,
          path: endpointPath,
          method,
          description: 'Primary default endpoint',
        },
      ],
    };

    try {
      const res = await fetch('/api/universal-apis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchApis();
        fetchUsage();
      } else {
        const err = await res.json();
        alert(`Failed to save API: ${err.error || 'Validation error'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  // Handle Live Connection Test
  const handleTestConnection = async () => {
    if (!baseUrl) {
      alert('Please enter a Base URL.');
      return;
    }

    let customHeadersObj = undefined;
    try {
      if (rawHeaders.trim()) customHeadersObj = JSON.parse(rawHeaders);
    } catch {
      alert('Invalid custom headers JSON');
      return;
    }

    let parsedBody = undefined;
    try {
      if (rawBody.trim()) parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }

    setIsTestingLive(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/universal-apis/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          baseUrl,
          endpointPath,
          method,
          environment,
          authType,
          secret,
          headerName,
          queryParamKey,
          prefix,
          customHeaders: customHeadersObj,
          body: parsedBody,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        connected: false,
        statusCode: 500,
        statusText: 'Client Error',
        durationMs: 0,
        error: err.message,
      });
    } finally {
      setIsTestingLive(false);
    }
  };

  // Test Existing API Card
  const handleTestExisting = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/universal-apis/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      alert(`Test Result: ${data.connected ? 'CONNECTED (HTTP ' + data.statusCode + ')' : 'FAILED: ' + data.error} (${data.durationMs}ms)`);
      fetchApis();
      fetchLogs();
      fetchUsage();
    } catch (err: any) {
      alert(`Test execution error: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  // Delete API
  const handleDelete = async (id: string, apiName: string) => {
    if (!confirm(`Are you sure you want to delete "${apiName}"?`)) return;
    try {
      const res = await fetch(`/api/universal-apis/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        fetchApis();
        fetchUsage();
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Import OpenAPI
  const handleImportOpenApi = async () => {
    if (!openApiSpecInput.trim()) return;
    try {
      const res = await fetch('/api/universal-apis/import-openapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ spec: openApiSpecInput }),
      });

      if (res.ok) {
        const { parsed } = await res.json();
        setName(parsed.title);
        setDescription(parsed.description || '');
        setBaseUrl(parsed.baseUrl || '');
        if (parsed.endpoints && parsed.endpoints.length > 0) {
          setEndpointPath(parsed.endpoints[0].path);
          setMethod(parsed.endpoints[0].method);
        }
        setIsOpenApiModalOpen(false);
        setIsModalOpen(true);
      } else {
        const err = await res.json();
        alert(`OpenAPI parse error: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  };

  const resetForm = () => {
    setName('');
    setProviderName('');
    setDescription('');
    setCategory('Custom APIs');
    setBaseUrl('');
    setEnvironment('DEVELOPMENT');
    setAuthType('NONE');
    setSecret('');
    setHeaderName('');
    setQueryParamKey('');
    setPrefix('');
    setEndpointPath('/');
    setMethod('GET');
    setRawHeaders('{\n  "Content-Type": "application/json"\n}');
    setRawBody('');
    setTestResult(null);
  };

  // Filtered APIs
  const filteredApis = apis.filter((api) => {
    const matchesSearch =
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.baseUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All Categories' || api.category === selectedCategory;

    if (activeTab === 'ai_providers') {
      return matchesSearch && matchesCategory && api.category.includes('AI');
    }
    if (activeTab === 'custom') {
      return matchesSearch && matchesCategory && api.category === 'Custom APIs';
    }
    if (activeTab === 'connected') {
      return matchesSearch && matchesCategory && api.status === 'CONNECTED';
    }
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] text-neutral-200 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-[#252525] bg-[#1a1a1a] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-800/40 rounded-lg text-cyan-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              Universal API Manager
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                SSRF-Safe Vault
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400">
              Manage, connect, test, and grant AI agents access to any REST, OpenAPI, or custom API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpenApiModalOpen(true)}
            className="px-3 py-1.5 text-xs bg-[#242424] hover:bg-[#2e2e2e] text-neutral-200 border border-[#383838] rounded-md flex items-center gap-1.5 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            Import OpenAPI
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add New API
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="h-10 border-b border-[#252525] bg-[#171717] px-6 flex items-center gap-1 overflow-x-auto select-none">
        {[
          { id: 'all', label: 'All APIs', icon: Layers },
          { id: 'ai_providers', label: 'AI Providers', icon: Cpu },
          { id: 'custom', label: 'Custom APIs', icon: Code },
          { id: 'connected', label: 'Connected APIs', icon: CheckCircle2 },
          { id: 'templates', label: 'API Templates', icon: FileJson },
          { id: 'usage', label: 'API Usage', icon: Activity },
          { id: 'logs', label: 'API Logs', icon: Terminal },
          { id: 'settings', label: 'API Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ManagerTab)}
              className={`h-full px-3 text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 font-medium bg-[#1e1e1e]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'templates' ? (
          /* Templates View */
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-200">Pre-built API Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl, i) => (
                <div
                  key={i}
                  className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg p-4 flex flex-col justify-between hover:border-cyan-800/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-neutral-100">{tpl.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#292929] text-cyan-400 font-mono">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mb-3">{tpl.description}</p>
                    <div className="text-[11px] text-neutral-500 font-mono break-all mb-3 bg-[#161616] p-2 rounded border border-[#222]">
                      {tpl.baseUrl}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setName(tpl.name);
                      setCategory(tpl.category);
                      setDescription(tpl.description);
                      setProviderName(tpl.providerName);
                      setBaseUrl(tpl.baseUrl);
                      setAuthType(tpl.authType as ApiAuthType);
                      setHeaderName(tpl.headerName || '');
                      setQueryParamKey(tpl.queryParamKey || '');
                      setPrefix(tpl.prefix || '');
                      if (tpl.defaultHeaders) setRawHeaders(JSON.stringify(tpl.defaultHeaders, null, 2));
                      if (tpl.defaultEndpoints && tpl.defaultEndpoints.length > 0) {
                        setEndpointPath(tpl.defaultEndpoints[0].path);
                        setMethod(tpl.defaultEndpoints[0].method);
                      }
                      setIsModalOpen(true);
                    }}
                    className="w-full py-1.5 text-xs bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 rounded font-medium transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'usage' ? (
          /* Usage Analytics View */
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-neutral-200">Aggregated Usage & Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg p-4">
                <span className="text-xs text-neutral-400">Total API Requests</span>
                <p className="text-2xl font-bold text-neutral-100 mt-1">
                  {usageStats?.totals?.totalRequests || 0}
                </p>
              </div>
              <div className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg p-4">
                <span className="text-xs text-emerald-400">Successful Responses</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {usageStats?.totals?.successfulRequests || 0}
                </p>
              </div>
              <div className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg p-4">
                <span className="text-xs text-red-400">Failed / Errors</span>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {usageStats?.totals?.failedRequests || 0}
                </p>
              </div>
              <div className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg p-4">
                <span className="text-xs text-amber-400">Rate Limit Hits</span>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {usageStats?.totals?.rateLimitHits || 0}
                </p>
              </div>
            </div>

            <div className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#191919]">
                <h3 className="text-xs font-semibold text-neutral-200">Breakdown by API</h3>
              </div>
              <div className="divide-y divide-[#262626]">
                {apis.map((api) => (
                  <div key={api.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-neutral-100">{api.name}</span>
                      <p className="text-neutral-500 font-mono text-[11px]">{api.baseUrl}</p>
                    </div>
                    <div className="flex items-center gap-6 text-neutral-300">
                      <span>Total: {api.usage?.totalRequests || 0}</span>
                      <span className="text-emerald-400">Passed: {api.usage?.successfulRequests || 0}</span>
                      <span className="text-red-400">Failed: {api.usage?.failedRequests || 0}</span>
                      <span className="text-neutral-500">
                        Last used: {api.lastUsedAt ? new Date(api.lastUsedAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'logs' ? (
          /* Logs View */
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-200">Live Request Execution Logs</h2>
            <div className="bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-12 px-4 py-2.5 bg-[#181818] border-b border-[#292929] text-[11px] text-neutral-400">
                <span className="col-span-2">Timestamp</span>
                <span className="col-span-3">API Name</span>
                <span className="col-span-1">Method</span>
                <span className="col-span-3">Endpoint Path</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-1">Duration</span>
                <span className="col-span-1">Caller</span>
              </div>
              <div className="divide-y divide-[#242424] max-h-[500px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500 text-xs font-sans">
                    No requests dispatched yet. Test or invoke an API to see live execution traces.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="grid grid-cols-12 px-4 py-2 hover:bg-[#202020] items-center">
                      <span className="col-span-2 text-neutral-500 text-[10px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="col-span-3 text-neutral-200 truncate">{log.apiConfig?.name || 'Custom'}</span>
                      <span className="col-span-1 font-bold text-cyan-400">{log.method}</span>
                      <span className="col-span-3 text-neutral-400 truncate">{log.endpointPath}</span>
                      <span
                        className={`col-span-1 font-semibold ${
                          log.success ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                      <span className="col-span-1 text-neutral-400">{log.durationMs}ms</span>
                      <span className="col-span-1 text-[10px] text-neutral-500">{log.initiatedBy}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          /* Settings View */
          <div className="max-w-2xl bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Universal Security & Network Vault Policy
            </h2>
            <div className="space-y-3 text-xs text-neutral-300">
              <div className="p-3 bg-[#151515] rounded border border-[#282828]">
                <strong className="text-neutral-100 block mb-1">AES-256-GCM Encryption</strong>
                All authentication secrets, tokens, and query parameters are encrypted at rest with hardware-accelerated AES-256-GCM. Decryption occurs strictly in-memory during dispatch.
              </div>
              <div className="p-3 bg-[#151515] rounded border border-[#282828]">
                <strong className="text-neutral-100 block mb-1">SSRF & DNS Pinning Protection</strong>
                Calls to loopback, link-local (169.254.169.254), private ranges (10.x, 172.16-31.x, 192.168.x), and cloud metadata providers are dynamically blocked at the network interface.
              </div>
              <div className="p-3 bg-[#151515] rounded border border-[#282828]">
                <strong className="text-neutral-100 block mb-1">Agent Approval Policy</strong>
                Autonomous AI agents can automatically query idempotent GET endpoints. Non-idempotent operations (POST, PUT, DELETE) require explicit user approval.
              </div>
            </div>
          </div>
        ) : (
          /* APIs Card Grid (All, AI Providers, Custom, Connected) */
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search APIs by name, category, or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#1b1b1b] border border-[#2e2e2e] rounded-md px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500"
                >
                  {API_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchApis}
                  title="Refresh APIs"
                  className="p-1.5 bg-[#1e1e1e] border border-[#2e2e2e] hover:bg-[#282828] text-neutral-400 rounded-md transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Grid */}
            {filteredApis.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#2b2b2b] rounded-lg">
                <Network className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-neutral-300 mb-1">No API Configurations Found</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
                  Add custom external REST APIs, OpenAPI specs, or configure preset templates to allow AI agents to invoke real data.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium"
                >
                  + Add First API
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApis.map((api) => {
                  const isConnected = api.status === 'CONNECTED';
                  const isError = api.status === 'ERROR';
                  return (
                    <div
                      key={api.id}
                      className="bg-[#1c1c1c] border border-[#2a2a2a] hover:border-[#383838] rounded-lg p-4 flex flex-col justify-between transition-colors relative group"
                    >
                      <div>
                        {/* Status Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-sm font-semibold text-neutral-100 block">
                              {api.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {api.category}
                            </span>
                          </div>

                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              isConnected
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                                : isError
                                ? 'bg-red-950/80 text-red-400 border border-red-800/40'
                                : 'bg-[#292929] text-neutral-400 border border-[#383838]'
                            }`}
                          >
                            {isConnected ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : isError ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {api.status}
                          </div>
                        </div>

                        {/* Description */}
                        {api.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                            {api.description}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="space-y-1.5 text-[11px] mb-4">
                          <div className="flex items-center justify-between text-neutral-400">
                            <span>Base URL:</span>
                            <span className="font-mono text-neutral-300 truncate max-w-[170px]">
                              {api.baseUrl}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-neutral-400">
                            <span>Auth Method:</span>
                            <span className="font-mono text-cyan-400">
                              {api.credential?.authType || 'NONE'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-neutral-400">
                            <span>Credential:</span>
                            <span className="font-mono text-neutral-500">
                              {api.credential?.maskedValue || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-3 border-t border-[#252525] flex items-center justify-between">
                        <button
                          onClick={() => handleTestExisting(api.id)}
                          disabled={testingId === api.id}
                          className="px-2.5 py-1 text-[11px] bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] text-neutral-200 rounded flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3 text-cyan-400" />
                          {testingId === api.id ? 'Testing...' : 'Test Connection'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(api.id, api.name)}
                            title="Delete API"
                            className="p-1 hover:bg-red-950/50 hover:text-red-400 text-neutral-500 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit API Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#292929] flex items-center justify-between bg-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-neutral-100">Universal API Configuration Builder</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveApi} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">API Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Weather API"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-1.5 text-neutral-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-1.5 text-neutral-100 focus:outline-none focus:border-cyan-500"
                  >
                    {API_CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Base URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-1.5 text-neutral-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-neutral-300 font-medium mb-1">HTTP Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as HttpMethod)}
                    className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-1.5 text-neutral-100 focus:outline-none focus:border-cyan-500"
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-neutral-300 font-medium mb-1">Endpoint Path</label>
                  <input
                    type="text"
                    value={endpointPath}
                    onChange={(e) => setEndpointPath(e.target.value)}
                    placeholder="/weather/current"
                    className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-1.5 text-neutral-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Authentication Settings */}
              <div className="p-3 bg-[#141414] border border-[#262626] rounded-lg space-y-3">
                <span className="font-semibold text-neutral-200 block text-xs">
                  Authentication & Security Vault
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Auth Type</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as ApiAuthType)}
                      className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded px-2.5 py-1 text-neutral-200"
                    >
                      <option value="NONE">No Authentication</option>
                      <option value="BEARER_TOKEN">Bearer Token (Authorization: Bearer ...)</option>
                      <option value="API_KEY">API Key Header (x-api-key)</option>
                      <option value="CUSTOM_HEADER">Custom Header Authentication</option>
                      <option value="QUERY_PARAM">Query Parameter (?api_key=...)</option>
                      <option value="BASIC_AUTH">Basic Auth (user:password)</option>
                    </select>
                  </div>

                  {authType !== 'NONE' && (
                    <div>
                      <label className="block text-neutral-400 mb-1">API Key / Token Secret</label>
                      <input
                        type="password"
                        placeholder="Secret key or token (encrypted via AES-256-GCM)"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded px-2.5 py-1 text-neutral-100 font-mono"
                      />
                    </div>
                  )}
                </div>

                {authType === 'CUSTOM_HEADER' && (
                  <div>
                    <label className="block text-neutral-400 mb-1">Custom Header Name</label>
                    <input
                      type="text"
                      placeholder="e.g. X-Custom-Auth"
                      value={headerName}
                      onChange={(e) => setHeaderName(e.target.value)}
                      className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded px-2.5 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                )}

                {authType === 'QUERY_PARAM' && (
                  <div>
                    <label className="block text-neutral-400 mb-1">Query Parameter Key</label>
                    <input
                      type="text"
                      placeholder="e.g. appid or api_key"
                      value={queryParamKey}
                      onChange={(e) => setQueryParamKey(e.target.value)}
                      className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded px-2.5 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* JSON Headers Editor */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Custom Headers (JSON)</label>
                <textarea
                  rows={3}
                  value={rawHeaders}
                  onChange={(e) => setRawHeaders(e.target.value)}
                  className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-2 text-neutral-100 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Live Test Connection Result View */}
              {testResult && (
                <div
                  className={`p-3 rounded border text-xs font-mono space-y-1 ${
                    testResult.connected
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      {testResult.connected ? '✓ CONNECTED' : '✗ TEST FAILED'} (HTTP {testResult.statusCode})
                    </span>
                    <span>{testResult.durationMs}ms</span>
                  </div>
                  {testResult.error && <p className="text-[11px]">{testResult.error}</p>}
                  {testResult.data && (
                    <pre className="text-[10px] max-h-32 overflow-y-auto bg-black/50 p-2 rounded text-neutral-300">
                      {typeof testResult.data === 'object'
                        ? JSON.stringify(testResult.data, null, 2)
                        : String(testResult.data)}
                    </pre>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#292929] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingLive}
                  className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-cyan-400 border border-[#383838] rounded font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isTestingLive ? 'Testing...' : 'Test Connection'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded shadow-sm"
                  >
                    Save API Configuration
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OpenAPI Import Modal */}
      {isOpenApiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-cyan-400" />
                Import OpenAPI / Swagger Specification
              </h3>
              <button
                onClick={() => setIsOpenApiModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              Paste your OpenAPI v3 or Swagger v2 JSON specification below. Endpoints, methods, and base URLs will be parsed automatically.
            </p>
            <textarea
              rows={8}
              placeholder='{ "openapi": "3.0.0", "info": { "title": "My API" }, "servers": [...] }'
              value={openApiSpecInput}
              onChange={(e) => setOpenApiSpecInput(e.target.value)}
              className="w-full bg-[#131313] border border-[#2b2b2b] rounded px-3 py-2 text-neutral-100 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOpenApiModalOpen(false)}
                className="px-3 py-1.5 bg-[#252525] text-neutral-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImportOpenApi}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded text-xs"
              >
                Parse & Populate Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
