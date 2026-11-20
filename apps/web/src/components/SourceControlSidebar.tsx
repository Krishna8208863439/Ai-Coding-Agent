import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  Plus,
  Minus,
  RotateCcw,
  RefreshCw,
  Trash2,
  UploadCloud,
  DownloadCloud,
  Check,
  AlertCircle,
  FileCode,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowUp,
  ArrowDown,
  GitMerge,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';

interface GitStatusFile {
  path: string;
  index: string;
  working_dir: string;
}

interface GitStatusData {
  isRepo: boolean;
  current: string | null;
  tracking: string | null;
  ahead: number;
  behind: number;
  files: GitStatusFile[];
  modified: string[];
  staged: string[];
  not_added: string[];
  deleted: string[];
  error?: string;
}

interface SourceControlSidebarProps {
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string, staged: boolean) => void;
}

export function SourceControlSidebar({
  onOpenFile,
  onOpenDiff,
}: SourceControlSidebarProps) {
  const { currentWorkspace, activeBranch, setActiveBranch } = useWorkspaceStore();
  const { addToast } = usePreferencesStore();
  const { accessToken } = useAuthStore();

  const [status, setStatus] = useState<GitStatusData | null>(null);
  const [remotes, setRemotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  // Sections collapse
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  const [unstagedCollapsed, setUnstagedCollapsed] = useState(false);
  const [untrackedCollapsed, setUntrackedCollapsed] = useState(false);

  // Branch switcher modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [allBranches, setAllBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState('');

  const fetchStatus = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);

    try {
      const authHeader: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      // 1. Fetch git status
      const res = await fetch(`/api/git/status?root=${encodeURIComponent(currentWorkspace.rootPath)}`, {
        headers: authHeader,
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.current) {
          setActiveBranch(data.current);
        }
      }

      // 2. Fetch git branch list
      const branchRes = await fetch(`/api/git/branch?root=${encodeURIComponent(currentWorkspace.rootPath)}`, {
        headers: authHeader,
      });
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        if (branchData.allBranches) {
          setAllBranches(branchData.allBranches);
        }
      }

      // 3. Fetch remotes
      const remotesRes = await fetch(`/api/git/remotes?root=${encodeURIComponent(currentWorkspace.rootPath)}`, {
        headers: authHeader,
      });
      if (remotesRes.ok) {
        const remotesData = await remotesRes.json();
        setRemotes(remotesData.remotes || []);
      }
    } catch (err: any) {
      console.error('Error fetching git status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, accessToken, setActiveBranch]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Stage files
  const handleStage = async (paths: string[] = []) => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch('/api/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: currentWorkspace.rootPath, paths }),
      });
      if (res.ok) {
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Stage Failed', err.message || 'Cannot stage file', 'error');
      }
    } catch (err: any) {
      addToast('Stage Error', err.message, 'error');
    }
  };

  // Unstage files
  const handleUnstage = async (paths: string[] = []) => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch('/api/git/unstage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: currentWorkspace.rootPath, paths }),
      });
      if (res.ok) {
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Unstage Failed', err.message || 'Cannot unstage file', 'error');
      }
    } catch (err: any) {
      addToast('Unstage Error', err.message, 'error');
    }
  };

  // Discard file changes
  const handleDiscard = async (filePath: string, isUntracked = false) => {
    if (!currentWorkspace) return;
    if (!confirm(`Are you sure you want to discard changes in ${filePath}?`)) return;

    try {
      const res = await fetch('/api/git/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          path: filePath,
          isUntracked,
        }),
      });
      if (res.ok) {
        addToast('Discarded', `Changes reverted in ${filePath}`, 'info');
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Discard Failed', err.message || 'Cannot revert', 'error');
      }
    } catch (err: any) {
      addToast('Discard Error', err.message, 'error');
    }
  };

  // Commit
  const handleCommit = async () => {
    if (!currentWorkspace || !commitMessage.trim()) return;

    // If nothing staged, auto-stage all tracked changes
    if ((!status?.staged || status.staged.length === 0) && (status?.modified?.length || 0) > 0) {
      await handleStage([]);
    }

    setIsCommitting(true);
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          message: commitMessage.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addToast('Committed', `[${data.commit || 'HEAD'}] ${commitMessage.trim()}`, 'success');
        setCommitMessage('');
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Commit Failed', err.message || 'Cannot commit', 'error');
      }
    } catch (err: any) {
      addToast('Commit Error', err.message, 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // Switch or create branch
  const handleCheckoutBranch = async (branchName: string, create = false) => {
    if (!currentWorkspace || !branchName.trim()) return;
    try {
      const res = await fetch('/api/git/branch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          branch: branchName.trim(),
          create,
        }),
      });

      if (res.ok) {
        addToast('Branch Switched', `Now on branch ${branchName}`, 'success');
        setIsBranchModalOpen(false);
        setNewBranchName('');
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Checkout Failed', err.message || 'Cannot switch branch', 'error');
      }
    } catch (err: any) {
      addToast('Checkout Error', err.message, 'error');
    }
  };

  // Push
  const handlePush = async () => {
    if (!currentWorkspace || remotes.length === 0) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: currentWorkspace.rootPath }),
      });
      if (res.ok) {
        addToast('Pushed', 'Changes pushed to remote.', 'success');
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Push Failed', err.message || 'Cannot push', 'error');
      }
    } catch (err: any) {
      addToast('Push Error', err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull
  const handlePull = async () => {
    if (!currentWorkspace || remotes.length === 0) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: currentWorkspace.rootPath }),
      });
      if (res.ok) {
        addToast('Pulled', 'Workspace updated from remote.', 'success');
        await fetchStatus();
      } else {
        const err = await res.json();
        addToast('Pull Failed', err.message || 'Cannot pull', 'error');
      }
    } catch (err: any) {
      addToast('Pull Error', err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 text-xs select-none">
        <GitBranch className="w-8 h-8 opacity-40 mb-2 text-cyan-400" />
        <span className="font-semibold text-neutral-300 mb-1">No Folder Open</span>
        <span className="text-[11px] text-neutral-500">Open a workspace folder to view Git source control.</span>
      </div>
    );
  }

  if (status && !status.isRepo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-400 text-xs select-none">
        <GitBranch className="w-10 h-10 opacity-30 text-neutral-400 mb-3" />
        <h4 className="font-semibold text-neutral-200 text-xs mb-1">Not a Git Repository</h4>
        <p className="text-[11px] text-neutral-500 mb-4 leading-normal">
          The open workspace "{currentWorkspace.name}" is not currently initialized with Git.
        </p>
        <button
          onClick={async () => {
            await handleStage([]);
            await fetchStatus();
          }}
          className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
        >
          Initialize Repository
        </button>
      </div>
    );
  }

  const stagedFiles = status?.staged || [];
  const modifiedFiles = status?.modified || [];
  const untrackedFiles = status?.not_added || [];
  const totalChanges = stagedFiles.length + modifiedFiles.length + untrackedFiles.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] text-xs select-none overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between text-neutral-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <span>Source Control</span>
          {totalChanges > 0 && (
            <span className="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded-full font-mono text-[9px]">
              {totalChanges}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Push / Pull controls */}
          <button
            onClick={handlePull}
            disabled={isSyncing || remotes.length === 0}
            title={remotes.length === 0 ? 'No remote configured for pull' : 'Pull from remote'}
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePush}
            disabled={isSyncing || remotes.length === 0}
            title={remotes.length === 0 ? 'No remote configured for push' : 'Push to remote'}
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <UploadCloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            title="Refresh Git Status"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Branch & Sync Bar */}
      <div className="px-3 py-1.5 bg-[#141414] border-b border-[#2b2b2b] flex items-center justify-between text-[11px]">
        <button
          onClick={() => setIsBranchModalOpen(true)}
          className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono hover:bg-[#202020] px-1.5 py-0.5 rounded transition-colors truncate"
          title="Switch Branch"
        >
          <GitBranch className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-semibold">{status?.current || activeBranch || 'main'}</span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
          {status?.tracking && (
            <span className="truncate text-neutral-500" title={`Tracking ${status.tracking}`}>
              {status.ahead > 0 && <span className="text-cyan-400 mr-1">↑{status.ahead}</span>}
              {status.behind > 0 && <span className="text-amber-400">↓{status.behind}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Commit Box */}
      <div className="p-2.5 border-b border-[#2b2b2b] bg-[#141414] space-y-1.5 shrink-0">
        <textarea
          rows={3}
          placeholder="Message (Ctrl+Enter to commit)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleCommit();
            }
          }}
          className="w-full bg-[#1e1e1e] border border-[#333] focus:border-cyan-500 rounded p-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none font-mono"
        />

        <button
          onClick={handleCommit}
          disabled={isCommitting || !commitMessage.trim()}
          className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          {isCommitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>Commit</span>
        </button>
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {/* 1. Staged Changes */}
        {stagedFiles.length > 0 && (
          <div>
            <div
              onClick={() => setStagedCollapsed(!stagedCollapsed)}
              className="flex items-center justify-between px-2 py-1 bg-[#1e1e1e] hover:bg-[#252526] cursor-pointer rounded text-neutral-300 font-semibold text-[11px]"
            >
              <div className="flex items-center gap-1">
                {stagedCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>STAGED CHANGES</span>
                <span className="text-[10px] text-cyan-400 font-mono">({stagedFiles.length})</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnstage([]);
                }}
                title="Unstage All"
                className="p-0.5 hover:text-white text-neutral-400"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {!stagedCollapsed && (
              <div className="py-0.5 space-y-0.5">
                {stagedFiles.map((file) => (
                  <div
                    key={file}
                    onClick={() => onOpenDiff?.(file, true)}
                    className="flex items-center justify-between px-2 py-1 hover:bg-[#252526] rounded cursor-pointer group text-neutral-300 hover:text-white"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{file}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">A</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnstage([file]);
                        }}
                        title="Unstage"
                        className="p-0.5 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Unstaged Modified Changes */}
        {modifiedFiles.length > 0 && (
          <div>
            <div
              onClick={() => setUnstagedCollapsed(!unstagedCollapsed)}
              className="flex items-center justify-between px-2 py-1 bg-[#1e1e1e] hover:bg-[#252526] cursor-pointer rounded text-neutral-300 font-semibold text-[11px]"
            >
              <div className="flex items-center gap-1">
                {unstagedCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>CHANGES</span>
                <span className="text-[10px] text-amber-400 font-mono">({modifiedFiles.length})</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStage([]);
                }}
                title="Stage All"
                className="p-0.5 hover:text-white text-neutral-400"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {!unstagedCollapsed && (
              <div className="py-0.5 space-y-0.5">
                {modifiedFiles.map((file) => (
                  <div
                    key={file}
                    onClick={() => onOpenDiff?.(file, false)}
                    className="flex items-center justify-between px-2 py-1 hover:bg-[#252526] rounded cursor-pointer group text-neutral-300 hover:text-white"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{file}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-amber-400 font-mono">M</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscard(file, false);
                        }}
                        title="Discard Changes"
                        className="p-0.5 text-neutral-400 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStage([file]);
                        }}
                        title="Stage"
                        className="p-0.5 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Untracked Files */}
        {untrackedFiles.length > 0 && (
          <div>
            <div
              onClick={() => setUntrackedCollapsed(!untrackedCollapsed)}
              className="flex items-center justify-between px-2 py-1 bg-[#1e1e1e] hover:bg-[#252526] cursor-pointer rounded text-neutral-300 font-semibold text-[11px]"
            >
              <div className="flex items-center gap-1">
                {untrackedCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>UNTRACKED</span>
                <span className="text-[10px] text-emerald-400 font-mono">({untrackedFiles.length})</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStage(untrackedFiles);
                }}
                title="Stage All Untracked"
                className="p-0.5 hover:text-white text-neutral-400"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {!untrackedCollapsed && (
              <div className="py-0.5 space-y-0.5">
                {untrackedFiles.map((file) => (
                  <div
                    key={file}
                    onClick={() => onOpenFile?.(file)}
                    className="flex items-center justify-between px-2 py-1 hover:bg-[#252526] rounded cursor-pointer group text-neutral-300 hover:text-white"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{file}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">U</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscard(file, true);
                        }}
                        title="Delete Untracked File"
                        className="p-0.5 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStage([file]);
                        }}
                        title="Stage File"
                        className="p-0.5 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {totalChanges === 0 && !isLoading && (
          <div className="py-8 text-center text-neutral-500 text-xs">
            No changes detected. Working tree clean.
          </div>
        )}
      </div>

      {/* Branch Switcher Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-sm w-full p-4 text-neutral-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#333] mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-neutral-100">Switch or Create Branch</span>
              </div>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing branches */}
            <div className="mb-3">
              <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-1.5">
                Existing Branches
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {allBranches.map((b) => (
                  <button
                    key={b}
                    onClick={() => handleCheckoutBranch(b)}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between font-mono text-[11px] transition-colors ${
                      b === (status?.current || activeBranch)
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'hover:bg-[#252526] text-neutral-300'
                    }`}
                  >
                    <span>{b}</span>
                    {b === (status?.current || activeBranch) && (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Create new branch */}
            <div className="pt-2 border-t border-[#2e2e2e]">
              <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-1.5">
                Create New Branch
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="feature/new-branch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1 bg-[#141414] border border-[#333] rounded px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  onClick={() => handleCheckoutBranch(newBranchName, true)}
                  disabled={!newBranchName.trim()}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded font-medium text-xs transition-colors shrink-0"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
