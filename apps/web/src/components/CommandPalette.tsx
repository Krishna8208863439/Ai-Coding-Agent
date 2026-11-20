import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, File, Hash, ArrowRight, CornerDownLeft, X } from 'lucide-react';
import { commandRegistry, CommandDefinition, CommandContext } from '../services/commandRegistry';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files?: Array<{ path: string; isDir: boolean }>;
  onOpenFile?: (path: string) => void;
  context: CommandContext;
}

export function CommandPalette({
  isOpen,
  onClose,
  files = [],
  onOpenFile,
  context,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Prefix modes:
  // ">" or normal: Command mode
  // "@": Symbol mode
  // ":": Go to line mode
  // plain string: Quick open fuzzy file search
  const isCommandMode = query.startsWith('>') || query.length === 0;
  const isLineMode = query.startsWith(':');
  const isSymbolMode = query.startsWith('@');

  let filteredCommands: CommandDefinition[] = [];
  let filteredFiles: Array<{ path: string; name: string }> = [];

  if (isCommandMode) {
    const term = query.startsWith('>') ? query.slice(1).trim().toLowerCase() : query.toLowerCase();
    filteredCommands = commandRegistry.getFiltered(context).filter((c) => {
      const fullText = `${c.category}: ${c.title}`.toLowerCase();
      return fullText.includes(term);
    });
  } else if (!isLineMode && !isSymbolMode) {
    const term = query.trim().toLowerCase();
    filteredFiles = files
      .filter((f) => !f.isDir)
      .map((f) => ({ path: f.path, name: f.path.split('/').pop() || f.path }))
      .filter((f) => f.path.toLowerCase().includes(term));
  }

  const totalItems = isCommandMode ? filteredCommands.length : filteredFiles.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isCommandMode && filteredCommands[selectedIndex]) {
        commandRegistry.execute(filteredCommands[selectedIndex].id, context);
        onClose();
      } else if (!isCommandMode && filteredFiles[selectedIndex]) {
        if (onOpenFile) onOpenFile(filteredFiles[selectedIndex].path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-xl bg-[#202020] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3 py-2.5 border-b border-[#2d2d2d] gap-2">
          {isCommandMode ? (
            <Command className="w-4 h-4 text-cyan-400 shrink-0" />
          ) : isLineMode ? (
            <Hash className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <File className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isCommandMode
                ? 'Type a command or category...'
                : 'Type file name to open, or ">" for commands, ":" for lines'
            }
            className="flex-1 bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-500 text-xs font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2c2c2c] rounded text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto py-1 text-xs">
          {isCommandMode && filteredCommands.length > 0 && (
            <div>
              {filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                const isDisabled = cmd.disabled ? cmd.disabled(context) : false;

                return (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      if (!isDisabled) {
                        commandRegistry.execute(cmd.id, context);
                        onClose();
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-950/60 text-cyan-200' : 'text-neutral-300 hover:bg-[#2a2a2a]'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-neutral-400 font-semibold">{cmd.category}:</span>
                      <span className="truncate">{cmd.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cmd.keybinding && (
                        <span className="px-1.5 py-0.5 rounded bg-[#181818] border border-[#333] text-[10px] font-mono text-neutral-400">
                          {cmd.keybinding}
                        </span>
                      )}
                      {isSelected && <CornerDownLeft className="w-3 h-3 text-cyan-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isCommandMode && filteredFiles.length > 0 && (
            <div>
              {filteredFiles.map((f, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={f.path}
                    onClick={() => {
                      if (onOpenFile) onOpenFile(f.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-950/60 text-indigo-200' : 'text-neutral-300 hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <File className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-medium text-neutral-200">{f.name}</span>
                      <span className="text-[11px] text-neutral-500 truncate">{f.path}</span>
                    </div>
                    {isSelected && <CornerDownLeft className="w-3 h-3 text-indigo-400" />}
                  </div>
                );
              })}
            </div>
          )}

          {totalItems === 0 && (
            <div className="px-4 py-6 text-center text-neutral-500 text-xs">
              No matching commands or files found.
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-3 py-1.5 border-t border-[#2d2d2d] bg-[#1a1a1a] flex items-center justify-between text-[10px] text-neutral-500">
          <span>Tip: Prefix with `&gt;` for commands, `:` for line jump</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
