import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  FileJson,
  Layers,
  AlertTriangle,
  RotateCcw,
  Plus,
  Lock,
  GitBranch,
} from 'lucide-react';
import { useWorkspaceStore, WorkspaceFileNode } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useIdeStore } from '../store/ideStore';
import { commandRegistry } from '../services/commandRegistry';

interface ExplorerSidebarProps {
  activeFilePath?: string;
  onOpenFile: (path: string) => void;
}

export function ExplorerSidebar({
  activeFilePath,
  onOpenFile,
}: ExplorerSidebarProps) {
  const {
    currentWorkspace,
    fileTree,
    fetchFileTree,
    toggleFolderExpand,
    setOpenFolderModalOpen,
    pendingConflict,
    setPendingConflict,
    recentWorkspaces,
    openWorkspace,
  } = useWorkspaceStore();

  const { addToast } = usePreferencesStore();
  const { openTabs, updateTabContent, markSaved, closeTab } = useIdeStore();

  const [filterText, setFilterText] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [createTargetDir, setCreateTargetDir] = useState('');

  // Helper for File Icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
      case 'css':
      case 'scss':
      case 'html':
        return <FileCode className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentWorkspace) return;

    const relPath = createTargetDir
      ? `${createTargetDir}/${newItemName.trim()}`
      : newItemName.trim();

    try {
      const res = await fetch('/api/fs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          path: relPath,
          isDir: isCreatingFolder,
        }),
      });

      if (res.ok) {
        addToast(
          isCreatingFolder ? 'Folder Created' : 'File Created',
          relPath,
          'success'
        );
        await fetchFileTree(createTargetDir);
        if (!isCreatingFolder) {
          onOpenFile(relPath);
        }
      } else {
        const err = await res.json();
        addToast('Create Failed', err.message || 'Cannot create entry', 'error');
      }
    } catch (err: any) {
      addToast('Error', err.message, 'error');
    } finally {
      setNewItemName('');
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, nodePath: string) => {
    e.stopPropagation();
    if (!currentWorkspace) return;

    if (!confirm(`Are you sure you want to delete ${nodePath}?`)) return;

    try {
      const res = await fetch('/api/fs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          path: nodePath,
        }),
      });

      if (res.ok) {
        addToast('Deleted', nodePath, 'info');
        closeTab(nodePath);
        const parentDir = nodePath.includes('/')
          ? nodePath.substring(0, nodePath.lastIndexOf('/'))
          : '';
        fetchFileTree(parentDir);
      } else {
        const err = await res.json();
        addToast('Delete Failed', err.message || 'Cannot delete', 'error');
      }
    } catch (err: any) {
      addToast('Delete Error', err.message, 'error');
    }
  };

  // Conflict banner handlers
  const handleReloadFromDisk = () => {
    if (!pendingConflict) return;
    updateTabContent(pendingConflict.path, pendingConflict.diskContent);
    markSaved(pendingConflict.path);
    setPendingConflict(null);
    addToast('File Reloaded', `${pendingConflict.path} reloaded from disk`, 'info');
  };

  const handleKeepMine = () => {
    setPendingConflict(null);
    addToast('Changes Kept', 'Local in-memory edits preserved', 'warning');
  };

  // Recursive Tree Node Renderer
  const renderNode = (node: WorkspaceFileNode, depth = 0) => {
    if (filterText && !node.isDir && !node.name.toLowerCase().includes(filterText.toLowerCase())) {
      return null;
    }

    const isActive = activeFilePath === node.path;
    const paddingLeft = `${depth * 14 + 10}px`;

    if (node.isDir) {
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={() => toggleFolderExpand(node.path)}
            style={{ paddingLeft }}
            className={`group flex items-center justify-between py-1 pr-2 rounded hover:bg-[#252526] cursor-pointer transition-colors text-neutral-300 hover:text-white ${
              node.ignored ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {node.isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              )}
              {node.isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
              )}
              <span className="truncate text-[11px] font-mono">{node.name}</span>
              {node.isLoading && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateTargetDir(node.path);
                  setIsCreatingFile(true);
                }}
                title="New File in Folder"
                className="p-0.5 hover:text-white text-neutral-400"
              >
                <FilePlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDelete(e, node.path)}
                title="Delete Folder"
                className="p-0.5 hover:text-red-400 text-neutral-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {node.isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        onClick={() => onOpenFile(node.path)}
        style={{ paddingLeft }}
        className={`group flex items-center justify-between py-1 pr-2 rounded cursor-pointer transition-colors ${
          isActive
            ? 'bg-[#007acc]/20 text-cyan-300 font-medium'
            : 'text-neutral-300 hover:bg-[#252526] hover:text-white'
        } ${node.ignored ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {getFileIcon(node.name)}
          <span className="truncate text-[11px] font-mono">{node.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => handleDelete(e, node.path)}
            title="Delete File"
            className="p-0.5 hover:text-red-400 text-neutral-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  // If NO Workspace is Open: Render Real Empty State
  if (!currentWorkspace) {
    return (
      <aside className="w-64 bg-[#181818] border-r border-[#2b2b2b] flex flex-col h-full select-none text-xs">
        <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
          Explorer
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <FolderOpen className="w-10 h-10 text-neutral-600 mb-3" />
          <h4 className="font-semibold text-neutral-200 text-xs mb-1">No Folder Open</h4>
          <p className="text-[11px] text-neutral-500 mb-4 leading-normal">
            Open a folder from your PC to edit, run, search, and enable AI agents.
          </p>

          <button
            onClick={() => setOpenFolderModalOpen(true)}
            className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium shadow transition-colors flex items-center justify-center gap-1.5 mb-2"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Folder...</span>
          </button>

          {recentWorkspaces.length > 0 && (
            <div className="w-full mt-4 text-left border-t border-[#262626] pt-3">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
                Recent Folders
              </span>
              <div className="space-y-1">
                {recentWorkspaces.slice(0, 4).map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => openWorkspace(rec.path)}
                    className="w-full text-left p-1.5 hover:bg-[#252526] rounded text-[11px] text-neutral-300 hover:text-white truncate block transition-colors font-mono"
                  >
                    📁 {rec.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#181818] border-r border-[#2b2b2b] flex flex-col h-full select-none text-xs">
      {/* Workspace Header */}
      <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between text-neutral-400 font-semibold tracking-wider uppercase text-[10px]">
        <span className="truncate" title={currentWorkspace.rootPath}>
          {currentWorkspace.name}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              setCreateTargetDir('');
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
            }}
            title="New File"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setCreateTargetDir('');
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
            }}
            title="New Folder"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fetchFileTree('')}
            title="Refresh Files"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* External Conflict Banner */}
      {pendingConflict && (
        <div className="p-2.5 bg-amber-950/90 border-b border-amber-700 text-amber-200 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>File changed on disk</span>
          </div>
          <p className="text-[10px] text-amber-300 truncate mb-2">
            {pendingConflict.path}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReloadFromDisk}
              className="px-2 py-0.5 bg-amber-800 hover:bg-amber-700 text-white rounded text-[10px] font-medium"
            >
              Reload
            </button>
            <button
              onClick={handleKeepMine}
              className="px-2 py-0.5 bg-[#252526] hover:bg-[#333] text-neutral-300 rounded text-[10px]"
            >
              Keep Mine
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-2 border-b border-[#2b2b2b] bg-[#141414]">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-2 text-neutral-500" />
          <input
            type="text"
            placeholder="Filter files..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-[#181818] border border-[#2e2e2e] rounded pl-7 pr-2 py-1 text-[11px] text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2 top-2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Create Form */}
      {(isCreatingFile || isCreatingFolder) && (
        <form onSubmit={handleCreateSubmit} className="p-2 bg-[#202020] border-b border-[#333]">
          <div className="text-[10px] text-neutral-400 mb-1 flex items-center gap-1">
            {isCreatingFolder ? <FolderPlus className="w-3 h-3" /> : <FilePlus className="w-3 h-3" />}
            <span>New {isCreatingFolder ? 'Folder' : 'File'} in {createTargetDir || 'root'}</span>
          </div>
          <input
            autoFocus
            type="text"
            placeholder={isCreatingFolder ? 'directory_name' : 'filename.ts'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full bg-[#141414] border border-cyan-500 rounded px-2 py-1 text-xs text-neutral-100 focus:outline-none font-mono"
          />
          <div className="flex justify-end gap-1 mt-1 text-[10px]">
            <button
              type="button"
              onClick={() => {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
              }}
              className="px-2 py-0.5 text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Lazy File Tree List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-neutral-500 text-xs">
            Workspace is empty or loading...
          </div>
        ) : (
          fileTree.map((node) => renderNode(node, 0))
        )}
      </div>
    </aside>
  );
}
