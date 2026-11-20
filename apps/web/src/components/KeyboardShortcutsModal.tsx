import React, { useState } from 'react';
import { X, Search, Keyboard } from 'lucide-react';
import { useLayoutStore } from '../store/layoutStore';
import { commandRegistry } from '../services/commandRegistry';

export function KeyboardShortcutsModal() {
  const { isKeybindingsModalOpen, closeKeybindingsModal } = useLayoutStore();
  const [filter, setFilter] = useState('');

  if (!isKeybindingsModalOpen) return null;

  const allCommands = commandRegistry.getAll().filter((c) => c.keybinding);

  const filtered = allCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(filter.toLowerCase()) ||
      c.category.toLowerCase().includes(filter.toLowerCase()) ||
      c.keybinding?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-xl w-full overflow-hidden text-neutral-200 text-xs max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-3 bg-[#252526] border-b border-[#333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-neutral-100">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={closeKeybindingsModal}
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="p-3 border-b border-[#2d2d2d] bg-[#171717]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              autoFocus
              placeholder="Search shortcuts..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[#121212] border border-[#333] rounded pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* List of Shortcuts */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#262626] p-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-neutral-500">No shortcuts found matching search.</div>
          ) : (
            filtered.map((cmd) => (
              <div
                key={cmd.id}
                className="px-3 py-2 flex items-center justify-between hover:bg-[#252526] transition-colors rounded"
              >
                <div>
                  <div className="font-medium text-neutral-200 text-xs">{cmd.title}</div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {cmd.category} • <span className="text-neutral-600">{cmd.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {cmd.keybinding?.split(' ').map((chord, cIdx) => (
                    <kbd
                      key={cIdx}
                      className="px-2 py-0.5 bg-[#141414] border border-[#383838] rounded text-[11px] font-mono text-cyan-300 shadow-xs"
                    >
                      {chord}
                    </kbd>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#181818] border-t border-[#2d2d2d] flex justify-between items-center text-[10px] text-neutral-500">
          <span>{filtered.length} shortcuts registered in NEXORA Command Registry</span>
          <button
            onClick={closeKeybindingsModal}
            className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333] text-white rounded text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
