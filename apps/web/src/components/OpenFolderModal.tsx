import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  HardDrive,
  Pin,
  Trash2,
  X,
  AlertTriangle,
  Monitor,
  ArrowUp,
  Search,
  Check,
} from 'lucide-react';
import { useWorkspaceStore, RecentWorkspaceItem } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';

interface BrowseEntry {
  name: string;
  path: string;
  isDir: boolean;
  readable: boolean;
}

export function OpenFolderModal() {
  const {
    isOpenFolderModalOpen,
    setOpenFolderModalOpen,
    openWorkspace,
    recentWorkspaces,
    fetchRecentWorkspaces,
  } = useWorkspaceStore();

  const { accessToken } = useAuthStore();
  const token = accessToken || 'dev';

  const [activeTab, setActiveTab] = useState<'browse' | 'recent'>('browse');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [pathInput, setPathInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isHomeConfirmation, setIsHomeConfirmation] = useState<boolean>(false);
  const [isNativeDialogLoading, setIsNativeDialogLoading] = useState<boolean>(false);

  // Fetch recent workspaces on open
  useEffect(() => {
    if (isOpenFolderModalOpen) {
      fetchRecentWorkspaces();
      browseDirectory('');
      setErrorMsg(null);
      setIsHomeConfirmation(false);
    }
  }, [isOpenFolderModalOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenFolderModalOpen) {
        setOpenFolderModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenFolderModalOpen]);

  const browseDirectory = async (targetPath: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsHomeConfirmation(false);

    try {
      const res = await fetch(`/api/fs/browse?path=${encodeURIComponent(targetPath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.message || 'Cannot access this directory');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setCurrentPath(data.currentPath || '');
      setParentPath(data.parentPath || null);
      setEntries(data.entries || []);
      setPathInput(data.currentPath || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPath = async (pathToOpen: string, confirmHome = false) => {
    if (!pathToOpen.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    const res = await openWorkspace(pathToOpen.trim(), confirmHome);
    setIsLoading(false);

    if (res.success) {
      setOpenFolderModalOpen(false);
    } else {
      if (res.isHomeDir) {
        setIsHomeConfirmation(true);
        setErrorMsg(res.error || 'Opening home directory requires extra confirmation.');
      } else {
        setErrorMsg(res.error || 'Failed to open folder.');
      }
    }
  };

  const handleNativeBrowse = async () => {
    setIsNativeDialogLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/fs/native-dialog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.path) {
        await handleOpenPath(data.path);
      } else if (data.cancelled) {
        // User cancelled picker
      } else {
        setErrorMsg(data.message || 'Native dialog failed. Use the in-app browser below.');
      }
    } catch {
      setErrorMsg('Native folder picker unavailable. Use the in-app browser below.');
    } finally {
      setIsNativeDialogLoading(false);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, id: string, currentPinned: boolean) => {
    e.stopPropagation();
    try {
      await fetch('/api/workspace/recent/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, isPinned: !currentPinned }),
      });
      fetchRecentWorkspaces();
    } catch {}
  };

  const handleRemoveRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/workspace/recent/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecentWorkspaces();
    } catch {}
  };

  if (!isOpenFolderModalOpen) return null;

  // Breadcrumbs calculation
  const breadcrumbSegments = currentPath
    ? currentPath.split(/[/\\]/).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="h-11 px-4 bg-[#252526] border-b border-[#333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-neutral-100">Open Folder</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-[#181818] rounded p-0.5 border border-[#333] text-xs">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-[#2a2a2a] text-cyan-300 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Browse Computer
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'recent'
                    ? 'bg-[#2a2a2a] text-cyan-300 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>Recent</span>
                {recentWorkspaces.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-neutral-700 text-neutral-300 rounded-full font-mono">
                    {recentWorkspaces.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setOpenFolderModalOpen(false)}
              className="text-neutral-400 hover:text-white p-1 hover:bg-[#333] rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="px-4 py-2.5 bg-red-950/80 border-b border-red-800 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {isHomeConfirmation && (
              <button
                onClick={() => handleOpenPath(pathInput, true)}
                className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded font-medium text-[11px] shrink-0"
              >
                Confirm & Open Home
              </button>
            )}
          </div>
        )}

        {/* Body */}
        {activeTab === 'browse' ? (
          <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
            {/* Direct Input & OS Browse */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste or type directory path (e.g. C:\Users\me\project)..."
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenPath(pathInput)}
                  className="w-full bg-[#141414] border border-[#333] rounded px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <button
                onClick={() => handleOpenPath(pathInput)}
                disabled={isLoading || !pathInput.trim()}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-40"
              >
                Open
              </button>

              <button
                onClick={handleNativeBrowse}
                disabled={isNativeDialogLoading}
                title="Open OS File Explorer folder picker dialog"
                className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] text-neutral-200 rounded text-xs flex items-center gap-1.5 transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browse OS...</span>
              </button>
            </div>

            {/* Breadcrumbs Navigation Bar */}
            <div className="flex items-center gap-1 text-xs bg-[#171717] px-3 py-1.5 rounded border border-[#2b2b2b] overflow-x-auto select-none">
              <button
                onClick={() => browseDirectory('')}
                className="hover:text-cyan-400 text-neutral-400 font-medium shrink-0 flex items-center gap-1"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Computer</span>
              </button>

              {breadcrumbSegments.map((segment, index) => {
                const isWindows = currentPath.includes(':');
                const subPath = isWindows
                  ? breadcrumbSegments.slice(0, index + 1).join('\\') + (index === 0 ? '\\' : '')
                  : '/' + breadcrumbSegments.slice(0, index + 1).join('/');

                const isLast = index === breadcrumbSegments.length - 1;

                return (
                  <React.Fragment key={index}>
                    <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />
                    <button
                      onClick={() => browseDirectory(subPath)}
                      className={`truncate max-w-[140px] px-1 py-0.5 rounded hover:bg-[#252526] transition-colors ${
                        isLast ? 'text-cyan-300 font-semibold' : 'text-neutral-300'
                      }`}
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                );
              })}

              {parentPath && (
                <button
                  onClick={() => browseDirectory(parentPath)}
                  title="Go to parent directory"
                  className="ml-auto p-1 hover:bg-[#252526] rounded text-neutral-400 hover:text-white"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Directory Listing */}
            <div className="flex-1 bg-[#141414] border border-[#2b2b2b] rounded overflow-y-auto min-h-[220px]">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Loading folder contents...
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No subdirectories found in this folder.
                </div>
              ) : (
                <div className="divide-y divide-[#222]">
                  {entries.map((entry) => (
                    <div
                      key={entry.path}
                      onClick={() => browseDirectory(entry.path)}
                      className="px-3 py-2 flex items-center justify-between hover:bg-[#222] cursor-pointer text-xs group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {entry.path.endsWith(':\\') ? (
                          <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        <span className="text-neutral-200 group-hover:text-white truncate font-mono">
                          {entry.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPath(entry.path);
                          }}
                          className="px-2 py-0.5 bg-cyan-700/80 hover:bg-cyan-600 text-white rounded text-[10px] font-medium"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Open Current Directory button */}
            {currentPath && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-neutral-400 truncate max-w-[400px]">
                  Current: <strong className="text-neutral-200 font-mono">{currentPath}</strong>
                </span>

                <button
                  onClick={() => handleOpenPath(currentPath)}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition-colors"
                >
                  Open This Folder
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Recent Workspaces Tab */
          <div className="flex-1 p-4 overflow-y-auto min-h-[280px]">
            {recentWorkspaces.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No recent folders yet. Open a folder to see it here.
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentWorkspaces.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleOpenPath(rec.path)}
                    className="p-3 bg-[#171717] hover:bg-[#222] border border-[#2b2b2b] hover:border-[#3c3c3c] rounded flex items-center justify-between cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Folder className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-neutral-100 group-hover:text-white">
                            {rec.name}
                          </span>
                          {rec.isPinned && (
                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] rounded font-mono">
                              PINNED
                            </span>
                          )}
                          {!rec.exists && (
                            <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 text-[9px] rounded font-mono">
                              NOT FOUND
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate font-mono mt-0.5">
                          {rec.path}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleTogglePin(e, rec.id, rec.isPinned)}
                        title={rec.isPinned ? 'Unpin' : 'Pin to top'}
                        className={`p-1.5 rounded transition-colors ${
                          rec.isPinned
                            ? 'text-amber-400 hover:bg-[#333]'
                            : 'text-neutral-400 hover:text-white hover:bg-[#333]'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleRemoveRecent(e, rec.id)}
                        title="Remove from recents"
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-[#333] rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
