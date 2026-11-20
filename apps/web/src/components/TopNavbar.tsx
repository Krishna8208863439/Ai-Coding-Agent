import React, { useState } from 'react';
import { commandRegistry } from '../services/commandRegistry';
import { useLayoutStore } from '../store/layoutStore';
import { usePreferencesStore } from '../store/preferencesStore';
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
}: TopNavbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { openCommandPalette } = useLayoutStore();

  const handleMenuAction = (commandId: string) => {
    commandRegistry.execute(commandId);
    setActiveMenu(null);
  };

  const menus: Record<string, Array<{ label: string; commandId: string; shortcut?: string; disabled?: boolean }>> = {
    File: [
      { label: 'New File', commandId: 'workbench.action.files.newFile', shortcut: 'Ctrl+N' },
      { label: 'Open Folder...', commandId: 'workbench.action.files.openFolder', shortcut: 'Ctrl+K Ctrl+O' },
      { label: 'Open Recent...', commandId: 'workbench.action.files.openRecent', shortcut: '' },
      { label: 'Save', commandId: 'workbench.action.files.save', shortcut: 'Ctrl+S' },
      { label: 'Save All', commandId: 'workbench.action.files.saveAll', shortcut: 'Ctrl+K S' },
      { label: 'Close Folder', commandId: 'workbench.action.files.closeFolder', shortcut: '' },
      { label: 'Toggle Sidebar', commandId: 'workbench.action.toggleSidebar', shortcut: 'Ctrl+B' },
      { label: 'Preferences & Settings', commandId: 'workbench.action.openSettings', shortcut: 'Ctrl+,' },
    ],
    Edit: [
      { label: 'Undo', commandId: 'editor.action.undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', commandId: 'editor.action.redo', shortcut: 'Ctrl+Y' },
      { label: 'Format Document', commandId: 'editor.action.formatDocument', shortcut: 'Shift+Alt+F' },
    ],
    Selection: [
      { label: 'Select All', commandId: 'editor.action.undo', shortcut: 'Ctrl+A' },
    ],
    View: [
      { label: 'Command Palette...', commandId: 'workbench.action.showCommands', shortcut: 'Ctrl+Shift+P' },
      { label: 'Quick Open...', commandId: 'workbench.action.quickOpen', shortcut: 'Ctrl+P' },
      { label: 'Toggle Primary Sidebar', commandId: 'workbench.action.toggleSidebar', shortcut: 'Ctrl+B' },
      { label: 'Toggle AI Agent Panel', commandId: 'workbench.action.toggleAiPanel', shortcut: 'Ctrl+Shift+A' },
      { label: 'Toggle Terminal Panel', commandId: 'workbench.action.toggleTerminal', shortcut: 'Ctrl+`' },
      { label: 'Open Settings', commandId: 'workbench.action.openSettings', shortcut: 'Ctrl+,' },
    ],
    Go: [
      { label: 'Go to Line...', commandId: 'editor.action.gotoLine', shortcut: 'Ctrl+G' },
    ],
    Run: [
      { label: 'Toggle Terminal / Run Panel', commandId: 'workbench.action.toggleTerminal', shortcut: 'F5' },
    ],
    Terminal: [
      { label: 'Toggle Terminal Panel', commandId: 'workbench.action.toggleTerminal', shortcut: 'Ctrl+`' },
    ],
    Help: [
      { label: 'Keyboard Shortcuts Reference', commandId: 'workbench.action.openSettings', shortcut: 'Ctrl+,' },
      { label: 'About NEXORA AI', commandId: 'workbench.action.openSettings', shortcut: '' },
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
                    <div className="absolute left-0 top-full mt-0.5 w-56 bg-[#252526] border border-[#3c3c3c] rounded shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-75">
                      {menus[menu].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleMenuAction(item.commandId)}
                          disabled={item.disabled}
                          className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white text-neutral-300 transition-colors disabled:opacity-40"
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Center: Search / Command Palette Bar */}
        <div
          onClick={() => openCommandPalette('>')}
          className="flex items-center justify-between w-96 px-2.5 py-1 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors shadow-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span className="truncate text-[11px]">{currentProjectName} — Search files, commands</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-500 bg-[#1e1e1e] px-1 rounded border border-[#333]">
            <span>Ctrl+P</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => commandRegistry.execute('workbench.action.toggleSidebar')}
            title="Toggle Primary Sidebar (Ctrl+B)"
            className="p-1.5 hover:bg-[#2c2c2c] rounded text-neutral-400 hover:text-neutral-200"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => commandRegistry.execute('workbench.action.toggleAiPanel')}
            title="Toggle AI Agent Panel (Ctrl+Shift+A)"
            className="p-1.5 hover:bg-[#2c2c2c] rounded text-cyan-400 hover:text-cyan-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => commandRegistry.execute('workbench.action.openSettings')}
            title="Preferences & Settings (Ctrl+,)"
            className="p-1.5 hover:bg-[#2c2c2c] rounded text-neutral-400 hover:text-neutral-200"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
    </>
  );
}
