import React, { useState } from 'react';
import {
  FolderTree,
  Folder,
  FolderOpen,
  FileCode,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
} from 'lucide-react';

export interface FileNode {
  path: string;
  isDir: boolean;
  size?: number;
}

interface ExplorerSidebarProps {
  projectName: string;
  files: FileNode[];
  activeFilePath?: string;
  onOpenFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRefresh: () => void;
}

export function ExplorerSidebar({
  projectName,
  files,
  activeFilePath,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRefresh,
}: ExplorerSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true });
  const [filterText, setFilterText] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onCreateFile(newFileName.trim());
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <aside className="w-64 bg-[#202020] border-r border-[#2b2b2b] flex flex-col h-full select-none text-xs">
      {/* Title & Actions */}
      <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between text-neutral-400 font-semibold tracking-wider uppercase text-[10px]">
        <span className="truncate">Explorer: {projectName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreatingFile(true)}
            title="New File"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            title="Refresh Files"
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter / Search within Explorer */}
      <div className="p-2 border-b border-[#2b2b2b] bg-[#1a1a1a]">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-2 text-neutral-500" />
          <input
            type="text"
            placeholder="Filter files by name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-[#131313] border border-[#2e2e2e] rounded pl-7 pr-2 py-1 text-[11px] text-neutral-200 focus:outline-none focus:border-cyan-500"
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

      {/* New File Inline Form */}
      {isCreatingFile && (
        <form onSubmit={handleCreateSubmit} className="p-2 bg-[#252525] border-b border-[#333]">
          <input
            autoFocus
            type="text"
            placeholder="src/filename.ts"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="w-full bg-[#141414] border border-cyan-500 rounded px-2 py-1 text-xs text-neutral-100 focus:outline-none"
          />
          <div className="flex justify-end gap-1 mt-1 text-[10px]">
            <button
              type="button"
              onClick={() => setIsCreatingFile(false)}
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

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-neutral-500 text-xs font-sans">
            No files found matching filter.
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isActive = activeFilePath === file.path;
            return (
              <div
                key={file.path}
                onClick={() => onOpenFile(file.path)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#007acc]/20 text-cyan-300 font-medium'
                    : 'text-neutral-300 hover:bg-[#282828] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {file.isDir ? (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate text-[11px] font-mono">{file.path}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.path);
                    }}
                    title="Delete file"
                    className="p-1 hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
