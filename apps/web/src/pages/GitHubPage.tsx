import { useState, useEffect } from 'react';
import {
  GitBranch,
  Github,
  UploadCloud,
  Download,
  CheckCircle2,
  Lock,
  Globe,
  RefreshCw,
  FolderDown,
  ExternalLink,
  Code2,
  ShieldAlert,
} from 'lucide-react';

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export function GitHubPage() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [branch, setBranch] = useState('main');
  const [commitMsg, setCommitMsg] = useState('feat: update from NEXORA AI workspace');
  const [projectId, setProjectId] = useState('proj-demo-1');
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/github/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setUsername(data.username);
        if (data.connected) {
          fetchRepos();
        }
      }
    } catch {
      // Offline fallback
    }
  };

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/github/repos', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
        if (data.repos?.length > 0) {
          setSelectedRepo(data.repos[0].name);
        }
      }
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: tokenInput || 'ghp_token_demo', username: usernameInput || 'nexora-developer' }),
      });
      if (res.ok) {
        setConnected(true);
        setUsername(usernameInput || 'nexora-developer');
        setTokenInput('');
        fetchRepos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/github/disconnect', { method: 'POST', credentials: 'include' });
      setConnected(false);
      setUsername(null);
      setRepos([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) return;
    setIsPushing(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          repoName: selectedRepo,
          branch,
          commitMessage: commitMsg,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPushResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPushing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportNotice(null);
    try {
      const res = await fetch(`/api/github/export/${projectId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Trigger browser JSON download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectId}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportNotice(`Exported ${data.totalFiles} files successfully!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Github className="w-6 h-6" />
            </div>
            GitHub Integration & Project Export
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Connect remote repositories, push workspace code with audit trails, and export standalone production bundles.
          </p>
        </div>

        {/* Export Action */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 w-36"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg border border-zinc-700 transition-colors"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
            Export Bundle
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {exportNotice}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Connection & Repos Panel (5 cols) */}
        <div className="col-span-5 space-y-6">
          {/* Connection Card */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Github className="w-4 h-4 text-purple-400" /> Account Connection
              </span>
              {connected ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400">
                  Disconnected
                </span>
              )}
            </h2>

            {connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center font-bold text-purple-300 text-xs">
                    {username ? username[0].toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{username}</div>
                    <div className="text-[11px] text-zinc-500">OAuth Scope: repo, read:user</div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs px-2.5 py-1 text-red-400 hover:bg-red-950/30 rounded border border-red-900/40 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">GitHub Personal Access Token (or OAuth)</label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Username (optional)</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. nexora-developer"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-lg transition-colors shadow-md shadow-purple-600/20"
                >
                  Connect GitHub Account
                </button>
              </div>
            )}
          </div>

          {/* Repositories List */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-zinc-400" /> Repositories
              </span>
              <span className="text-xs text-zinc-500 font-normal">{repos.length} found</span>
            </h2>

            <div className="space-y-2">
              {repos.length === 0 ? (
                <div className="text-xs text-zinc-500 py-6 text-center">
                  Connect account above to view available repositories.
                </div>
              ) : (
                repos.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRepo(r.name)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRepo === r.name
                        ? 'bg-zinc-800/80 border-purple-500/50'
                        : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        {r.private ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-zinc-400" />}
                        {r.name}
                      </span>
                      <span className="text-zinc-500 font-mono text-[11px]">{r.defaultBranch}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{r.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Push to GitHub Workspace (7 cols) */}
        <div className="col-span-7 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" /> Push Workspace to Remote
              </h2>
              <span className="text-xs text-zinc-400">Autonomous Git Sync</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Target Repository</label>
                <input
                  type="text"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  placeholder="Select or enter repo name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Target Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Commit Message</label>
              <textarea
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Guardrail Policy:</strong> Push operations require explicit user trigger. Plaintext secrets and
                sensitive `.env` files are automatically redacted by the security agent prior to commit.
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {pushResult && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Push Completed Successfully!
                  </span>
                  <a
                    href={pushResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:underline text-indigo-400"
                  >
                    View Commit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono space-y-1">
                  <div>SHA: {pushResult.commitSha}</div>
                  <div>Files Pushed: {pushResult.filesPushed}</div>
                  <div>Branch: {pushResult.branch}</div>
                </div>
              </div>
            )}

            <button
              onClick={handlePush}
              disabled={isPushing || !connected || !selectedRepo}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Packaging & Pushing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Push Workspace Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

