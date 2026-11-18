import React, { useState } from 'react';
import { useIdeStore } from '../store/ideStore';
import {
  Code2,
  FolderOpen,
  Play,
  Terminal,
  Settings,
  HelpCircle,
  Search,
  Maximize2,
  Minimize2,
  Columns,
  Layers,
  ChevronDown,
  Sparkles,
  Command,
  FileCode,
  X,
} from 'lucide-react';

interface TopNavbarProps {
  currentProjectName?: string;
  onToggleSidebar?: () => void;
  onToggleAiPanel?: () => void;
  onToggleBottomPanel?: () => void;
  onOpenSettings?: () => void;
  onNewFile?: () => void;
  onSaveFile?: () => void;
  onOpenFile?: (path: string) => void;
}

export function TopNavbar({
  currentProjectName = 'NEXORA Workspace',
  onToggleSidebar,
  onToggleAiPanel,
  onToggleBottomPanel,
  onOpenSettings,
  onNewFile,
  onSaveFile,
  onOpenFile,
}: TopNavbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const { triggerEditorAction } = useIdeStore();

  const commandItems = [
    { label: 'File: New File', action: () => onNewFile && onNewFile(), shortcut: 'Ctrl+N' },
    { label: 'File: Save Current File', action: () => onSaveFile && onSaveFile(), shortcut: 'Ctrl+S' },
    { label: 'View: Toggle Primary Sidebar', action: () => onToggleSidebar && onToggleSidebar(), shortcut: 'Ctrl+B' },
    { label: 'View: Toggle AI Agent Panel', action: () => onToggleAiPanel && onToggleAiPanel(), shortcut: 'Ctrl+Shift+A' },
    { label: 'View: Toggle Terminal Panel', action: () => onToggleBottomPanel && onToggleBottomPanel(), shortcut: 'Ctrl+`' },
    { label: 'Preferences: Open User Settings', action: () => onOpenSettings && onOpenSettings(), shortcut: 'Ctrl+,' },
    { label: 'Open File: src/index.ts', action: () => onOpenFile && onOpenFile('src/index.ts'), shortcut: 'Enter' },
    { label: 'Open File: package.json', action: () => onOpenFile && onOpenFile('package.json'), shortcut: 'Enter' },
    { label: 'Open File: README.md', action: () => onOpenFile && onOpenFile('README.md'), shortcut: 'Enter' },
  ];

  const filteredCommands = commandItems.filter((c) =>
    c.label.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  const menus: Record<string, Array<{ label: string; action?: () => void; shortcut?: string }>> = {
    File: [
      { label: 'New File', action: onNewFile, shortcut: 'Ctrl+N' },
      { label: 'Save', action: onSaveFile, shortcut: 'Ctrl+S' },
      { label: 'Toggle Sidebar', action: onToggleSidebar, shortcut: 'Ctrl+B' },
      { label: 'Preferences & Settings', action: onOpenSettings, shortcut: 'Ctrl+,' },
    ],
    Edit: [
      { label: 'Undo', action: () => triggerEditorAction('undo'), shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: () => triggerEditorAction('redo'), shortcut: 'Ctrl+Y' },
      { label: 'Cut', action: () => triggerEditorAction('editor.action.clipboardCutAction'), shortcut: 'Ctrl+X' },
      { label: 'Copy', action: () => triggerEditorAction('editor.action.clipboardCopyAction'), shortcut: 'Ctrl+C' },
      { label: 'Paste', action: () => triggerEditorAction('editor.action.clipboardPasteAction'), shortcut: 'Ctrl+V' },
      { label: 'Find in Files', action: () => triggerEditorAction('find'), shortcut: 'Ctrl+F' },
      { label: 'Replace', action: () => triggerEditorAction('replace'), shortcut: 'Ctrl+H' },
      { label: 'Format Document', action: () => triggerEditorAction('format'), shortcut: 'Shift+Alt+F' },
    ],
    Selection: [
      { label: 'Select All', action: () => triggerEditorAction('selectAll'), shortcut: 'Ctrl+A' },
      { label: 'Copy Line Up', action: () => triggerEditorAction('copyLineUp'), shortcut: 'Alt+Shift+Up' },
      { label: 'Copy Line Down', action: () => triggerEditorAction('copyLineDown'), shortcut: 'Alt+Shift+Down' },
    ],
    View: [
      { label: 'Toggle Primary Sidebar', action: onToggleSidebar, shortcut: 'Ctrl+B' },
      { label: 'Toggle AI Agent Panel', action: onToggleAiPanel, shortcut: 'Ctrl+Shift+A' },
      { label: 'Toggle Terminal Panel', action: onToggleBottomPanel, shortcut: 'Ctrl+`' },
      { label: 'Open Settings', action: onOpenSettings, shortcut: 'Ctrl+,' },
    ],
    Go: [
      { label: 'Go to Line...', action: () => triggerEditorAction('gotoLine'), shortcut: 'Ctrl+G' },
    ],
    Run: [
      { label: 'Start Application / Run', action: onToggleBottomPanel, shortcut: 'F5' },
    ],
    Terminal: [
      { label: 'Toggle Terminal Panel', action: onToggleBottomPanel, shortcut: 'Ctrl+`' },
      { label: 'New Terminal Session', action: onToggleBottomPanel, shortcut: 'Ctrl+Shift+`' },
    ],
    Help: [
      { label: 'Keyboard Shortcuts Reference', action: onOpenSettings, shortcut: 'Ctrl+K Ctrl+S' },
      { label: 'About NEXORA AI', action: onOpenSettings, shortcut: '' },
    ],
  };

  return (
    <>
      <header className="h-9 bg-[#1c1c1c] border-b border-[#2d2d2d] flex items-center justify-between px-2 text-xs select-none z-50">
        {/* Left: Branding & Top Menu Bar */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 font-bold text-white tracking-wide">
            <div className="w-4 h-4 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] shadow">
              N
            </div>
            <span className="text-[12px] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              NEXORA AI
            </span>
          </div>

          {/* Dropdown Menus */}
          <nav className="flex items-center ml-1">
            {Object.keys(menus).map((menu) => (
              <div key={menu} className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                  onMouseEnter={() => activeMenu && setActiveMenu(menu)}
                  className={`px-2 py-1 rounded text-neutral-300 hover:text-white hover:bg-[#2a2a2a] transition-colors ${
                    activeMenu === menu ? 'bg-[#2a2a2a] text-white' : ''
                  }`}
                >
                  {menu}
                </button>

                {activeMenu === menu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActiveMenu(null)}
                    />
                    <div className="absolute left-0 top-full mt-0.5 w-52 bg-[#252525] border border-[#383838] rounded shadow-2xl py-1 z-50">
                      {menus[menu].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setActiveMenu(null);
                            if (item.action) item.action();
                          }}
                          className="px-3 py-1.5 flex items-center justify-between hover:bg-[#007acc] hover:text-white text-neutral-300 cursor-pointer text-[11px]"
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="text-neutral-500 hover:text-neutral-200 text-[10px]">
                              {item.shortcut}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Middle: Universal Project Search / Command Bar */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full h-6 bg-[#252525] hover:bg-[#2b2b2b] border border-[#333333] hover:border-[#444] rounded px-3 flex items-center justify-between text-neutral-400 text-[11px] transition-colors shadow-inner"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3 h-3 text-neutral-500" />
              <span className="text-neutral-300 font-medium">{currentProjectName}</span>
              <span className="text-neutral-500 font-normal">— Search files, commands, agents</span>
            </span>
            <kbd className="bg-[#1e1e1e] border border-[#333] px-1 rounded text-[9px] text-neutral-400 font-mono">
              Ctrl+P
            </kbd>
          </button>
        </div>

        {/* Right: Layout Controls, Settings, System Status */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSidebar}
            title="Toggle Primary Sidebar (Ctrl+B)"
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleBottomPanel}
            title="Toggle Terminal & Panel (Ctrl+`)"
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleAiPanel}
            title="Toggle AI Agent Panel (Ctrl+Shift+A)"
            className="p-1.5 rounded text-cyan-400 hover:text-cyan-300 hover:bg-[#2a2a2a] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#333] mx-1" />

          <button
            onClick={onOpenSettings}
            title="NEXORA Settings"
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-[#1c1c1c] border border-[#383838] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-[#2d2d2d] flex items-center gap-2">
              <Command className="w-4 h-4 text-cyan-400" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or file name..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
              <button
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-neutral-500 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-1 text-xs">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-neutral-500 text-xs">
                  No commands or files matching "{paletteSearch}"
                </div>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      cmd.action();
                      setIsCommandPaletteOpen(false);
                      setPaletteSearch('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white rounded flex items-center justify-between text-neutral-300 transition-colors"
                  >
                    <span>{cmd.label}</span>
                    <span className="text-[10px] font-mono text-neutral-500">{cmd.shortcut}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
