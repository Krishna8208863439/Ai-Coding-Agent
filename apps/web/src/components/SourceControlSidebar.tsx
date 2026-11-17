import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Check,
  AlertCircle,
  FileCode,
  FolderArchive,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';

interface SourceControlSidebarProps {
  onOpenFile?: (path: string) => void;
}

export function SourceControlSidebar({ onOpenFile }: SourceControlSidebarProps) {
  const { currentProjectId, openTabs } = useIdeStore();
  const { accessToken } = useAuthStore();

  const [commitMessage, setCommitMessage] = useState('');
  const [branch, setBranch] = useState('main');
  const [repoName, setRepoName] = useState('nexora-workspace-app');
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [patToken, setPatToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Check connection status on mount
  useEffect(() => {
    if (!accessToken) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/github/status', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.connected);
          setUsername(data.username);
        }
      } catch {}
    };

    fetchStatus();
  }, [accessToken]);

  // Connect GitHub Account
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patToken.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/github/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: patToken.trim(), username: 'developer' }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsConnected(true);
        setUsername(data.username);
        setStatusMessage({ text: `Connected as @${data.username}`, type: 'success' });
        setPatToken('');
      } else {
        setStatusMessage({ text: 'Failed to authenticate token', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Network connection failed', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disconnect GitHub
  const handleDisconnect = async () => {
    try {
      await fetch('/api/github/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setIsConnected(false);
      setUsername(null);
      setStatusMessage({ text: 'GitHub disconnected', type: 'info' });
    } catch {}
  };

  // Commit & Push to GitHub
  const handleCommitAndPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || !currentProjectId) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          repoName,
          branch,
          commitMessage: commitMessage.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({
          text: `Pushed ${data.filesPushed} files to ${data.repo} (${data.commitSha.slice(0, 7)})`,
          type: 'success',
        });
        setCommitMessage('');
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMessage({ text: err.error || 'Failed to push commit', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Project Archive
  const handleExportZip = async () => {
    if (!currentProjectId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/github/export/${currentProjectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-${currentProjectId}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage({ text: `Exported ${data.totalFiles} files as project bundle.`, type: 'success' });
      }
    } catch {
      setStatusMessage({ text: 'Failed to export project archive', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changedTabs = openTabs.filter((t) => t.isDirty);

  return (
    <aside className="w-64 bg-[#202020] border-r border-[#2b2b2b] flex flex-col h-full select-none text-xs">
      {/* Title Bar */}
      <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between text-neutral-400 font-semibold tracking-wider uppercase text-[10px]">
        <span className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" /> Source Control
        </span>
        <button
          onClick={handleExportZip}
          title="Export Workspace Archive"
          className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors text-neutral-400"
        >
          <FolderArchive className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* GitHub Connection Status */}
        <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2d2d2d] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-neutral-400">GitHub Remote</span>
            {isConnected ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <Check className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="text-[10px] text-neutral-500">Not Connected</span>
            )}
          </div>

          {isConnected ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span>@{username || 'developer'}</span>
                <button
                  onClick={handleDisconnect}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Disconnect
                </button>
              </div>
              <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" /> OAuth / PAT Access Verified
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-2 pt-1">
              <input
                type="password"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
                placeholder="Paste GitHub Token (PAT)..."
                className="w-full bg-[#121212] border border-[#333] rounded px-2 py-1 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isSubmitting || !patToken.trim()}
                className="w-full py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium text-[11px] transition-colors"
              >
                Connect GitHub
              </button>
            </form>
          )}
        </div>

        {/* Status Notification Message */}
        {statusMessage && (
          <div
            className={`p-2 rounded text-[11px] border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-red-950/40 border-red-800/60 text-red-300'
                : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Commit Message Box */}
        <form onSubmit={handleCommitAndPush} className="space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-neutral-400">Target Repository</label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="repo-name"
              className="w-full bg-[#181818] border border-[#2e2e2e] rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-neutral-400">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-[#181818] border border-[#2e2e2e] rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-neutral-400">Commit Message</label>
            <textarea
              rows={3}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Message (Ctrl+Enter to commit)..."
              className="w-full bg-[#181818] border border-[#2e2e2e] rounded p-2 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !commitMessage.trim() || !isConnected}
            className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>Commit & Push to Remote</span>
          </button>
        </form>

        {/* Changes List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-neutral-400">
            <span>Working Tree Changes</span>
            <span className="text-cyan-400">{changedTabs.length} modified</span>
          </div>

          {changedTabs.length === 0 ? (
            <div className="text-neutral-500 py-3 text-center text-[11px]">
              No uncommitted local changes
            </div>
          ) : (
            changedTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => onOpenFile && onOpenFile(tab.path)}
                className="p-1.5 rounded bg-[#181818] border border-[#292929] hover:bg-[#252525] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-neutral-200 truncate">{tab.path}</span>
                </div>
                <span className="font-mono text-cyan-400 text-[10px] font-bold">M</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
