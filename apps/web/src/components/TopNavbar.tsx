import React, { useState } from 'react';
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
} from 'lucide-react';

interface TopNavbarProps {
  currentProjectName?: string;
  onToggleSidebar?: () => void;
  onToggleAiPanel?: () => void;
  onToggleBottomPanel?: () => void;
  onOpenSettings?: () => void;
}

export function TopNavbar({
  currentProjectName = 'NEXORA Workspace',
  onToggleSidebar,
  onToggleAiPanel,
  onToggleBottomPanel,
  onOpenSettings,
}: TopNavbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menus: Record<string, Array<{ label: string; action?: string; shortcut?: string }>> = {
    File: [
      { label: 'New File', shortcut: 'Ctrl+N' },
      { label: 'Open Project...', shortcut: 'Ctrl+O' },
      { label: 'Save', shortcut: 'Ctrl+S' },
      { label: 'Save All', shortcut: 'Ctrl+Shift+S' },
      { label: 'Export Project (ZIP)', shortcut: 'Ctrl+E' },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', shortcut: 'Ctrl+Y' },
      { label: 'Cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', shortcut: 'Ctrl+V' },
      { label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
    ],
    Selection: [
      { label: 'Select All', shortcut: 'Ctrl+A' },
      { label: 'Expand Selection', shortcut: 'Alt+Shift+Right' },
      { label: 'Copy Line Up', shortcut: 'Alt+Shift+Up' },
      { label: 'Copy Line Down', shortcut: 'Alt+Shift+Down' },
    ],
    View: [
      { label: 'Toggle Primary Sidebar', shortcut: 'Ctrl+B' },
      { label: 'Toggle AI Agent Panel', shortcut: 'Ctrl+Shift+A' },
      { label: 'Toggle Terminal Panel', shortcut: 'Ctrl+`' },
      { label: 'Appearance', shortcut: '' },
    ],
    Run: [
      { label: 'Start Debugging', shortcut: 'F5' },
      { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' },
      { label: 'Run Automated Tests', shortcut: 'Ctrl+T' },
    ],
    Terminal: [
      { label: 'New Terminal', shortcut: 'Ctrl+Shift+`' },
      { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
      { label: 'Run Build Task', shortcut: 'Ctrl+Shift+B' },
    ],
    Help: [
      { label: 'Documentation', shortcut: '' },
      { label: 'Release Notes (v1.0.0)', shortcut: '' },
      { label: 'Architecture & ADRs', shortcut: '' },
    ],
  };

  return (
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
                          if (item.label.includes('Sidebar') && onToggleSidebar) onToggleSidebar();
                          if (item.label.includes('AI') && onToggleAiPanel) onToggleAiPanel();
                          if (item.label.includes('Terminal') && onToggleBottomPanel) onToggleBottomPanel();
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
          onClick={() => {}}
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
  );
}
