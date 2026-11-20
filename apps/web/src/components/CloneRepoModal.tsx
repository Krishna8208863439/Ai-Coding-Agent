import React, { useState } from 'react';
import { X, GitBranch, DownloadCloud, Loader2, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';

interface CloneRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloneRepoModal({ isOpen, onClose }: CloneRepoModalProps) {
  const { openWorkspace } = useWorkspaceStore();
  const { addToast } = usePreferencesStore();

  const [repoUrl, setRepoUrl] = useState('');
  const [targetDir, setTargetDir] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBrowseTarget = async () => {
    try {
      const res = await fetch('/api/fs/native-dialog', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.path) {
          setTargetDir(data.path);
        }
      }
    } catch {}
  };

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsCloning(true);
    setError(null);

    try {
      // Determine target folder name from repo url
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'cloned-repo';
      const destination = targetDir.trim()
        ? `${targetDir.trim()}/${repoName}`
        : `C:/Users/krish/${repoName}`;

      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `git clone "${repoUrl.trim()}" "${destination}"`,
        }),
      });

      if (res.ok) {
        addToast('Clone Succeeded', `Cloned ${repoUrl} to ${destination}`, 'success');
        onClose();
        // Automatically open the cloned folder
        await openWorkspace(destination);
      } else {
        const err = await res.json();
        setError(err.message || 'Clone failed');
      }
    } catch (err: any) {
      setError(err.message || 'Clone request failed');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-neutral-200 text-xs">
        {/* Header */}
        <div className="p-3.5 bg-[#252526] border-b border-[#333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-neutral-100">Clone Git Repository</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleClone} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-red-950/40 border border-red-800 rounded text-red-300 text-[11px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Repository URL (HTTPS or SSH)
            </label>
            <input
              autoFocus
              type="text"
              placeholder="https://github.com/owner/repository.git"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full bg-[#141414] border border-[#333] focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Parent Destination Folder (Optional)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Leave blank for default user folder"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                className="flex-1 bg-[#141414] border border-[#333] focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleBrowseTarget}
                title="Browse folder"
                className="px-2.5 py-1.5 bg-[#252526] hover:bg-[#333] border border-[#3c3c3c] rounded text-neutral-300 hover:text-white transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2e2e2e]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] rounded text-neutral-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCloning || !repoUrl.trim()}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isCloning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DownloadCloud className="w-3.5 h-3.5" />
              )}
              <span>{isCloning ? 'Cloning...' : 'Clone Repository'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
