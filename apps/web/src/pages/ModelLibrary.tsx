import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@nexora/ui';
import { Library, Search, Eye, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';
import { ModelInfo } from '@nexora/shared';

export function ModelLibrary() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [filterTools, setFilterTools] = useState(false);
  const [filterVision, setFilterVision] = useState(false);
  const [defaultModelId, setDefaultModelId] = useState<string>('gemini-2.0-flash');

  useEffect(() => {
    fetch(`/api/providers/models?provider=${selectedProvider}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.models) {
          setModels(data.models);
        }
      });
  }, [selectedProvider]);

  const filtered = models.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchesTools = !filterTools || m.supportsTools;
    const matchesVision = !filterVision || m.supportsVision;
    return matchesSearch && matchesTools && matchesVision;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Library className="h-6 w-6 text-indigo-400" />
            AI Model Library & Capability Registry
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Browse discovered models, compare token contexts, tool calling capabilities, and select platform defaults.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">Active Default: {defaultModelId}</Badge>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search models by name or id (e.g. gpt-4o, claude, gemini)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#1f2433] bg-[#0d0f17] pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="rounded-lg border border-[#1f2433] bg-[#0d0f17] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Providers</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="anthropic">Anthropic</option>
          <option value="groq">Groq</option>
          <option value="mistral">Mistral</option>
          <option value="deepseek">DeepSeek</option>
          <option value="ollama">Ollama</option>
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterTools(!filterTools)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
              filterTools ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300' : 'border-[#1f2433] bg-[#0d0f17] text-neutral-400 hover:text-white'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Tool Calling</span>
          </button>
          <button
            onClick={() => setFilterVision(!filterVision)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
              filterVision ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300' : 'border-[#1f2433] bg-[#0d0f17] text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Vision</span>
          </button>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const isCurrentDefault = defaultModelId === m.id;
          return (
            <Card key={m.id} className={`transition-colors ${isCurrentDefault ? 'border-indigo-500/60 bg-indigo-950/15' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">{m.name}</CardTitle>
                    <p className="font-mono text-[11px] text-neutral-500 mt-0.5">{m.id}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {m.provider}
                  </Badge>
                </div>
              </CardHeader>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Context Limit:</span>
                  <span className="font-mono text-neutral-200">{(m.contextWindow / 1000).toFixed(0)}k tokens</span>
                </div>

                <div className="flex items-center gap-2">
                  {m.supportsTools && (
                    <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-[10px] text-neutral-300">
                      <Wrench className="h-2.5 w-2.5 text-indigo-400" />
                      Tools
                    </span>
                  )}
                  {m.supportsVision && (
                    <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-[10px] text-neutral-300">
                      <Eye className="h-2.5 w-2.5 text-emerald-400" />
                      Vision
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1f2433] flex items-center justify-between">
                  {isCurrentDefault ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Default Model
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDefaultModelId(m.id)}
                      className="text-[11px] h-7 px-2.5 gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-400" />
                      <span>Set as Default</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
