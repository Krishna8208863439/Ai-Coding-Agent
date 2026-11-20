import React, { useState } from 'react';
import { commandRegistry } from '../services/commandRegistry';
import { useLayoutStore } from '../store/layoutStore';
import {
  Search,
  Settings,
  Columns,
  Sparkles,
} from 'lucide-react';

interface MenuItem {
  label: string;
  commandId: string;
  shortcut?: string;
  disabled?: boolean;
  isSeparator?: boolean;
}

interface TopNavbarProps {
  currentProjectName?: string;
}

export function TopNavbar({ currentProjectName = 'NEXORA Workspace' }: TopNavbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { openCommandPalette } = useLayoutStore();

  const handleMenuAction = (item: MenuItem) => {
    if (item.isSeparator || item.disabled) return;
    commandRegistry.execute(item.commandId);
    setActiveMenu(null);
  };

  const sep = (): MenuItem => ({ label: '---', commandId: '', isSeparator: true });

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'New File', commandId: 'workbench.action.files.newFile', shortcut: 'Ctrl+N' },
      { label: 'New Folder', commandId: 'workbench.action.files.newFolder' },
      sep(),
      { label: 'Open File...', commandId: 'workbench.action.files.openFile', shortcut: 'Ctrl+O' },
      { label: 'Open Folder...', commandId: 'workbench.action.files.openFolder', shortcut: 'Ctrl+K Ctrl+O' },
      { label: 'Open Recent...', commandId: 'workbench.action.files.openRecent' },
      sep(),
      { label: 'Save', commandId: 'workbench.action.files.save', shortcut: 'Ctrl+S' },
      { label: 'Save As...', commandId: 'workbench.action.files.saveAs', shortcut: 'Ctrl+Shift+S' },
      { label: 'Save All', commandId: 'workbench.action.files.saveAll', shortcut: 'Ctrl+K S' },
      sep(),
      { label: 'Close Editor', commandId: 'workbench.action.closeActiveEditor', shortcut: 'Ctrl+W' },
      { label: 'Close Folder', commandId: 'workbench.action.files.closeFolder' },
      sep(),
      { label: 'Preferences & Settings', commandId: 'workbench.action.openSettings', shortcut: 'Ctrl+,' },
    ],
    Edit: [
      { label: 'Undo', commandId: 'editor.action.undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', commandId: 'editor.action.redo', shortcut: 'Ctrl+Y' },
      sep(),
      { label: 'Cut', commandId: 'editor.action.cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', commandId: 'editor.action.copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', commandId: 'editor.action.paste', shortcut: 'Ctrl+V' },
      sep(),
      { label: 'Find', commandId: 'editor.action.find', shortcut: 'Ctrl+F' },
      { label: 'Replace', commandId: 'editor.action.replace', shortcut: 'Ctrl+H' },
      sep(),
      { label: 'Find in Files', commandId: 'editor.action.findInFiles', shortcut: 'Ctrl+Shift+F' },
      { label: 'Replace in Files', commandId: 'editor.action.replaceInFiles', shortcut: 'Ctrl+Shift+H' },
      sep(),
      { label: 'Toggle Line Comment', commandId: 'editor.action.toggleLineComment', shortcut: 'Ctrl+/' },
      { label: 'Format Document', commandId: 'editor.action.formatDocument', shortcut: 'Shift+Alt+F' },
    ],
    Selection: [
      { label: 'Select All', commandId: 'editor.action.selectAll', shortcut: 'Ctrl+A' },
      { label: 'Expand Selection', commandId: 'editor.action.expandSelection', shortcut: 'Shift+Alt+→' },
      { label: 'Shrink Selection', commandId: 'editor.action.shrinkSelection', shortcut: 'Shift+Alt+←' },
      sep(),
      { label: 'Add Cursor Above', commandId: 'editor.action.addCursorAbove', shortcut: 'Ctrl+Alt+↑' },
      { label: 'Add Cursor Below', commandId: 'editor.action.addCursorBelow', shortcut: 'Ctrl+Alt+↓' },
      sep(),
      { label: 'Copy Line Up', commandId: 'editor.action.copyLineUp', shortcut: 'Shift+Alt+↑' },
      { label: 'Copy Line Down', commandId: 'editor.action.copyLineDown', shortcut: 'Shift+Alt+↓' },
      { label: 'Move Line Up', commandId: 'editor.action.moveLineUp', shortcut: 'Alt+↑' },
      { label: 'Move Line Down', commandId: 'editor.action.moveLineDown', shortcut: 'Alt+↓' },
    ],
    View: [
      { label: 'Command Palette...', commandId: 'workbench.action.showCommands', shortcut: 'Ctrl+Shift+P' },
      { label: 'Quick Open...', commandId: 'workbench.action.quickOpen', shortcut: 'Ctrl+P' },
      sep(),
      { label: 'Explorer', commandId: 'workbench.view.explorer', shortcut: 'Ctrl+Shift+E' },
      { label: 'Search', commandId: 'workbench.view.search', shortcut: 'Ctrl+Shift+F' },
      { label: 'Source Control', commandId: 'workbench.view.scm', shortcut: 'Ctrl+Shift+G' },
      { label: 'Run & Debug', commandId: 'workbench.view.debug', shortcut: 'Ctrl+Shift+D' },
      sep(),
      { label: 'Terminal Panel', commandId: 'workbench.action.toggleTerminal', shortcut: 'Ctrl+`' },
      { label: 'Output', commandId: 'workbench.view.output' },
      { label: 'Problems', commandId: 'workbench.view.problems' },
      { label: 'Debug Console', commandId: 'workbench.view.debug' },
      sep(),
      { label: 'Toggle Primary Sidebar', commandId: 'workbench.action.toggleSidebar', shortcut: 'Ctrl+B' },
      { label: 'Toggle AI Agent Panel', commandId: 'workbench.action.toggleAiPanel', shortcut: 'Ctrl+Shift+A' },
      { label: 'Toggle Status Bar', commandId: 'workbench.action.toggleStatusBar' },
      sep(),
      { label: 'Toggle Full Screen', commandId: 'workbench.action.toggleFullScreen', shortcut: 'F11' },
      { label: 'Zoom In', commandId: 'workbench.action.zoomIn', shortcut: 'Ctrl+=' },
      { label: 'Zoom Out', commandId: 'workbench.action.zoomOut', shortcut: 'Ctrl+-' },
      { label: 'Reset Zoom', commandId: 'workbench.action.resetZoom', shortcut: 'Ctrl+0' },
      sep(),
      { label: 'Open Settings', commandId: 'workbench.action.openSettings', shortcut: 'Ctrl+,' },
    ],
    Go: [
      { label: 'Back', commandId: 'workbench.action.navigateBack', shortcut: 'Alt+←' },
      { label: 'Forward', commandId: 'workbench.action.navigateForward', shortcut: 'Alt+→' },
      sep(),
      { label: 'Go to File...', commandId: 'workbench.action.quickOpen', shortcut: 'Ctrl+P' },
      { label: 'Go to Symbol in Workspace...', commandId: 'workbench.action.gotoSymbol', shortcut: 'Ctrl+Shift+O' },
      { label: 'Go to Line...', commandId: 'editor.action.gotoLine', shortcut: 'Ctrl+G' },
    ],
    Run: [
      { label: 'Start Debugging', commandId: 'workbench.action.debug.start', shortcut: 'F5' },
      { label: 'Run Without Debugging', commandId: 'workbench.action.debug.run', shortcut: 'Ctrl+F5' },
      sep(),
      { label: 'Stop', commandId: 'workbench.action.debug.stop', shortcut: 'Shift+F5' },
      { label: 'Restart', commandId: 'workbench.action.debug.restart', shortcut: 'Ctrl+Shift+F5' },
    ],
    Terminal: [
      { label: 'New Terminal', commandId: 'workbench.action.terminal.new', shortcut: 'Ctrl+Shift+`' },
      { label: 'Split Terminal', commandId: 'workbench.action.terminal.split' },
      sep(),
      { label: 'Run Selected Text in Terminal', commandId: 'workbench.action.terminal.runSelectedText' },
      { label: 'Clear Terminal', commandId: 'workbench.action.terminal.clear' },
    ],
    Help: [
      { label: 'Keyboard Shortcuts Reference', commandId: 'workbench.action.openKeybindingsReference', shortcut: 'Ctrl+K Ctrl+S' },
      sep(),
      { label: 'About NEXORA AI', commandId: 'workbench.action.showAbout' },
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
                    <div className="absolute left-0 top-full mt-0.5 min-w-56 w-max bg-[#252526] border border-[#3c3c3c] rounded shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-75">
                      {menus[menu].map((item, idx) =>
                        item.isSeparator ? (
                          <hr key={idx} className="border-[#3c3c3c] my-0.5 mx-2" />
                        ) : (
                          <button
                            key={idx}
                            onClick={() => handleMenuAction(item)}
                            disabled={item.disabled}
                            title={item.disabled ? 'Not available' : undefined}
                            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white text-neutral-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span>{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[10px] text-neutral-400 font-mono ml-6 shrink-0">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                        )
                      )}
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
            <span className="truncate text-[11px]">{currentProjectName} – Search files, commands</span>
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
