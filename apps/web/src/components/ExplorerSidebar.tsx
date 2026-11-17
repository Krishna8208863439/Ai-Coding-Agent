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
} from 'lucide-react';

interface FileNode {
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

      {/* Filter / Quick Search */}
      <div className="p-2 border-b border-[#282828]">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-2 text-neutral-500" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-[#181818] border border-[#333] rounded pl-7 pr-2 py-1 text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* New File Inline Input */}
        {isCreatingFile && (
          <form onSubmit={handleCreateSubmit} className="px-2 py-1 flex items-center gap-1.5 bg-[#252525]">
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => !newFileName && setIsCreatingFile(false)}
              placeholder="e.g. src/index.ts"
              className="w-full bg-[#181818] border border-cyan-500 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none font-mono"
            />
          </form>
        )}

        {filteredFiles.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-500 text-[11px]">
            No files found in project.
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isActive = activeFilePath === file.path;
            const isDir = file.isDir;
            const depth = file.path.split('/').length - 1;

            return (
              <div
                key={file.path}
                onClick={() => (isDir ? toggleFolder(file.path) : onOpenFile(file.path))}
                style={{ paddingLeft: `${Math.max(8, depth * 12 + 8)}px` }}
                className={`group flex items-center justify-between pr-2 py-1 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#007acc]/20 text-cyan-300 font-medium'
                    : 'text-neutral-300 hover:bg-[#282828] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isDir ? (
                    expandedFolders[file.path] ? (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate text-[11px] font-mono">{file.path}</span>
                </div>

                {!isDir && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${file.path}?`)) {
                        onDeleteFile(file.path);
                      }
                    }}
                    title="Delete File"
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
