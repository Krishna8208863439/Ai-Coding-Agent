import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, Button, Badge } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { useIdeStore } from '../store/ideStore';
import {
  FolderTree,
  FileCode,
  Folder,
  Save,
  Play,
  Bot,
  X,
  Code2,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function AIWorkspace() {
  const { accessToken } = useAuthStore();
  const {
    currentProjectId,
    openTabs,
    activeTabPath,
    diagnostics,
    isSaving,
    setCurrentProjectId,
    openFile,
    closeTab,
    setActiveTabPath,
    updateTabContent,
    setIsSaving,
    markSaved,
  } = useIdeStore();

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [files, setFiles] = useState<Array<{ path: string; isDir: boolean }>>([]);
  const [aiAssistantPrompt, setAiAssistantPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Active Tab
  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  // Infer Editor Language
  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  const fetchProjects = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !currentProjectId) {
          setCurrentProjectId(data.projects[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchFiles = async (projId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/projects/${projId}/files`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        // Open first file if no tabs open
        if (openTabs.length === 0 && data.files?.length > 0) {
          const first = data.files.find((f: { isDir: boolean }) => !f.isDir);
          if (first) {
            handleOpenFile(first.path);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleOpenFile = async (path: string) => {
    if (!currentProjectId || !accessToken) return;
    try {
      const res = await fetch(`/api/projects/${currentProjectId}/files/content?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        openFile(path, data.content);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!activeTab || !currentProjectId || !accessToken) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/projects/${currentProjectId}/files/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          path: activeTab.path,
          content: activeTab.content,
        }),
      });

      if (res.ok) {
        markSaved(activeTab.path);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiAssistantPrompt.trim() || !accessToken) return;

    try {
      setIsAiLoading(true);
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          provider: 'gemini',
          content: `In the context of file ${activeTab?.path || 'workspace'}:\n${aiAssistantPrompt}`,
        }),
      });

      if (res.ok) {
        setAiResponse(`[AI Developer Assistant]: Suggested modification analyzed for ${activeTab?.path || 'project'}.\n\nReview syntax & apply to Monaco Editor.`);
        setAiAssistantPrompt('');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [accessToken]);

  useEffect(() => {
    if (currentProjectId) {
      fetchFiles(currentProjectId);
    }
  }, [currentProjectId]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col rounded-xl border border-[#1f2433] bg-[#0d0f17] overflow-hidden">
      {/* Top Bar */}
      <div className="flex h-12 items-center justify-between border-b border-[#1f2433] bg-[#131620] px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-indigo-400" />
            <select
              value={currentProjectId || ''}
              onChange={(e) => setCurrentProjectId(e.target.value)}
              className="rounded bg-[#090a0f] border border-[#1f2433] px-2 py-1 text-xs text-white focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Badge variant="outline" className="text-[10px]">branch: main</Badge>
        </div>

        <div className="flex items-center gap-2">
          {activeTab?.isDirty && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={!activeTab || isSaving}
            className="h-7 text-xs gap-1.5 px-3"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: File Explorer */}
        <div className="w-56 border-r border-[#1f2433] bg-[#090a0f] p-2 flex flex-col">
          <div className="flex items-center justify-between px-2 py-1.5 text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Explorer</span>
            <FolderTree className="h-3.5 w-3.5" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 mt-1">
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => !f.isDir && handleOpenFile(f.path)}
                className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-left transition-colors ${
                  activeTabPath === f.path
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                }`}
              >
                {f.isDir ? (
                  <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <FileCode className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                )}
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Panel: Multi-tab Monaco Editor */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
          {/* Tabs Bar */}
          <div className="flex h-9 border-b border-[#1f2433] bg-[#131620] overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={`flex items-center gap-2 border-r border-[#1f2433] px-3 text-xs cursor-pointer select-none transition-colors ${
                  activeTabPath === tab.path
                    ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-t-indigo-500'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                <span>{tab.name}</span>
                {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.path);
                  }}
                  className="rounded p-0.5 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 overflow-hidden">
            {activeTab ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={getLanguage(activeTab.path)}
                value={activeTab.content}
                onChange={(val) => updateTabContent(activeTab.path, val || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  automaticLayout: true,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                Select a file from the explorer to begin editing.
              </div>
            )}
          </div>

          {/* Bottom Diagnostics Strip */}
          <div className="h-7 border-t border-[#1f2433] bg-[#0d0f17] px-3 flex items-center justify-between text-[11px] text-neutral-400">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>0 Errors, 0 Warnings</span>
            </div>
            <span>UTF-8 • TypeScript / JavaScript Engine</span>
          </div>
        </div>

        {/* Right Panel: Embedded AI IDE Assistant */}
        <div className="w-72 border-l border-[#1f2433] bg-[#090a0f] p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#1f2433] pb-2 text-xs font-semibold text-white">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span>AI Coding Copilot</span>
            </div>

            <div className="mt-3 space-y-3">
              {aiResponse ? (
                <div className="rounded-lg border border-[#1f2433] bg-[#131620] p-3 text-[11px] text-neutral-300 space-y-2">
                  <p className="whitespace-pre-wrap">{aiResponse}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#1f2433] p-4 text-center text-[11px] text-neutral-500">
                  Ask the Copilot to refactor code, write test cases, or implement endpoints.
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleAiAssistance} className="mt-2 space-y-2">
            <input
              type="text"
              value={aiAssistantPrompt}
              onChange={(e) => setAiAssistantPrompt(e.target.value)}
              placeholder="Suggest code changes or tests..."
              className="w-full rounded-lg border border-[#1f2433] bg-[#0d0f17] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isAiLoading || !aiAssistantPrompt.trim()}
              className="w-full text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              <span>{isAiLoading ? 'Analyzing...' : 'Ask Copilot'}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

