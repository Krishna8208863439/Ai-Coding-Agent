import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { TopNavbar } from './TopNavbar';
import { ActivityBar, ActivityTab } from './ActivityBar';
import { ExplorerSidebar } from './ExplorerSidebar';
import { SourceControlSidebar } from './SourceControlSidebar';
import { AiAgentPanel } from './AiAgentPanel';
import { BottomPanel } from './BottomPanel';
import { StatusBar } from './StatusBar';
import { SettingsModal } from './SettingsModal';
import { ToastContainer } from './ToastContainer';
import { CommandPalette } from './CommandPalette';
import { OpenFolderModal } from './OpenFolderModal';
import { TrustFolderDialog } from './TrustFolderDialog';
import { useNavigate } from 'react-router-dom';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useLayoutStore } from '../store/layoutStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { commandRegistry } from '../services/commandRegistry';
import { useGlobalKeybindings } from '../services/keybindingService';
import { initializeCoreCommands } from '../services/coreCommands';
import {
  FileCode,
  X,
  Save,
  Play,
  RotateCcw,
  Sparkles,
  Columns,
  Code2,
  Search,
  Bot,
  Terminal,
  Bug,
  FolderKanban,
  Package,
  Network,
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';

interface IdeLayoutProps {
  children?: React.ReactNode;
}

export function IdeLayout({ children }: IdeLayoutProps) {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const token = accessToken || 'dev';
  const { openSettings, preferences, addToast } = usePreferencesStore();
  const {
    currentProjectId,
    openTabs,
    activeTabPath,
    isSaving,
    openFile,
    closeTab,
    setActiveTabPath,
    updateTabContent,
    setIsSaving,
    markSaved,
    setEditorInstance,
  } = useIdeStore();

  const {
    currentWorkspace,
    activeBranch,
    openWorkspace,
    setTrustDialogOpen,
    setOpenFolderModalOpen,
  } = useWorkspaceStore();

  const {
    activeSidebarTab,
    isSidebarOpen,
    isBottomPanelOpen,
    isAiPanelOpen,
    isCommandPaletteOpen,
    setActiveSidebarTab,
    toggleSidebar,
    toggleBottomPanel,
    toggleAiPanel,
    closeCommandPalette,
  } = useLayoutStore();

  // Initialize core commands on mount
  useEffect(() => {
    initializeCoreCommands();
  }, []);

  // Global keybinding hook
  useGlobalKeybindings(() => ({
    editorFocus: !!activeTabPath,
    folderOpen: !!currentWorkspace || !!currentProjectId,
    isSaving,
  }));

  // Auto-reopen last workspace from localStorage on initial load
  useEffect(() => {
    const lastWorkspaceRoot = localStorage.getItem('nexora_last_workspace_root');
    if (lastWorkspaceRoot && !currentWorkspace) {
      openWorkspace(lastWorkspaceRoot).catch(() => {});
    }
  }, []);

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  // Infer Editor Language
  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  const handleOpenFile = async (relPath: string) => {
    // Check if already open
    const existing = openTabs.find((t) => t.path === relPath);
    if (existing) {
      setActiveTabPath(relPath);
      return;
    }

    if (currentWorkspace) {
      try {
        const res = await fetch(
          `/api/fs/read?root=${encodeURIComponent(currentWorkspace.rootPath)}&path=${encodeURIComponent(relPath)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          const err = await res.json();
          addToast('Cannot Open File', err.message || 'File access error', 'error');
          return;
        }

        const data = await res.json();
        if (data.binary) {
          openFile(relPath, `[Binary file cannot be displayed or edited in text editor]\nSize: ${data.size} bytes`);
        } else {
          openFile(relPath, data.content);
          if (data.warning) {
            addToast('Large File Warning', data.warning, 'warning');
          }
        }
      } catch (err: any) {
        addToast('File Error', err.message, 'error');
      }
    } else {
      openFile(relPath, `// ${relPath}\n// NEXORA AI Source File\n`);
    }
  };

  const handleSaveActive = async () => {
    await commandRegistry.execute('workbench.action.files.save');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#171717] text-neutral-200 overflow-hidden select-none font-sans">
      {/* 1. VS Code-Style Top Navbar */}
      <TopNavbar
        currentProjectName={currentWorkspace ? currentWorkspace.name : 'NEXORA Workspace'}
      />

      {/* Restricted Mode Global Warning Banner */}
      {currentWorkspace?.isRestricted && (
        <div className="h-7 bg-amber-950/90 border-b border-amber-700/80 px-4 flex items-center justify-between text-xs text-amber-200 z-40">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Restricted Mode:</strong> Running in untrusted mode. AI terminal execution and file writes are restricted.
            </span>
          </div>
          <button
            onClick={() => setTrustDialogOpen(true)}
            className="px-2.5 py-0.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-[11px] font-medium transition-colors"
          >
            Trust This Folder
          </button>
        </div>
      )}

      {/* 2. Main Middle Workspace Grid */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          onSelectTab={(tab) => {
            if (tab === 'universal-apis') {
              navigate('/api-manager');
              return;
            }
            if (tab === 'extensions') {
              navigate('/models');
              return;
            }
            if (tab === 'projects') {
              navigate('/new-project');
              return;
            }
            setActiveSidebarTab(tab);
          }}
        />

        {/* Primary Dynamic Sidebar Slot */}
        {isSidebarOpen && (
          <aside className="w-64 border-r border-[#2b2b2b] bg-[#181818] flex flex-col shrink-0 select-none">
            {activeSidebarTab === 'explorer' && (
              <ExplorerSidebar
                activeFilePath={activeTabPath || undefined}
                onOpenFile={handleOpenFile}
              />
            )}

            {activeSidebarTab === 'git' && (
              <SourceControlSidebar onOpenFile={handleOpenFile} />
            )}

            {activeSidebarTab === 'search' && (
              <div className="flex-1 flex flex-col p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200 uppercase text-[11px] pb-2 border-b border-[#2d2d2d]">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Search in Files</span>
                </div>
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Search workspace..."
                    className="w-full bg-[#141414] border border-[#333] rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <div className="text-[10px] text-neutral-500">
                    Phase 4 will connect real Ripgrep fulltext search.
                  </div>
                </div>
              </div>
            )}

            {activeSidebarTab === 'debug' && (
              <div className="flex-1 flex flex-col p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200 uppercase text-[11px] pb-2 border-b border-[#2d2d2d]">
                  <Bug className="w-3.5 h-3.5 text-amber-400" />
                  <span>Run & Debug Configurations</span>
                </div>
                <div className="mt-3 text-neutral-400">
                  <p>Run configurations active in Bottom Panel.</p>
                  <button
                    onClick={toggleBottomPanel}
                    className="mt-2 px-3 py-1 bg-[#252526] hover:bg-[#2d2d2d] border border-[#333] rounded text-neutral-200 text-xs"
                  >
                    Open Terminal / Debug
                  </button>
                </div>
              </div>
            )}

            {activeSidebarTab === 'agents' && (
              <div className="flex-1 flex flex-col p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200 uppercase text-[11px] pb-2 border-b border-[#2d2d2d]">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Engineering Agent Roster</span>
                </div>
                <div className="mt-3 space-y-1.5 overflow-y-auto">
                  {['ARCHITECT', 'DEVELOPER', 'TESTER', 'DEBUGGER', 'SECURITY', 'UI_UX', 'PROJECT_MANAGER'].map((role) => (
                    <div key={role} className="p-2 rounded bg-[#202020] border border-[#2b2b2b]">
                      <div className="font-semibold text-cyan-300">{role}</div>
                      <div className="text-[10px] text-neutral-400">Autonomous role active</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSidebarTab === 'terminal' && (
              <div className="flex-1 flex flex-col p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200 uppercase text-[11px] pb-2 border-b border-[#2d2d2d]">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Integrated Terminal</span>
                </div>
                <p className="mt-3 text-neutral-400">Focusing terminal in bottom workspace panel...</p>
              </div>
            )}
          </aside>
        )}

        {/* Central Editor / Viewport Area */}
        <main className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden min-w-0">
          {children ? (
            children
          ) : (
            <>
              {/* Editor Tab Bar */}
              <div className="h-9 bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between px-2 overflow-x-auto select-none">
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  {openTabs.map((tab) => {
                    const isActive = tab.path === activeTabPath;
                    return (
                      <div
                        key={tab.path}
                        onClick={() => setActiveTabPath(tab.path)}
                        className={`h-7 px-3 flex items-center gap-2 text-xs border-r border-[#262626] cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#1e1e1e] text-white border-t-2 border-t-cyan-500 font-medium'
                            : 'bg-[#141414] text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-200'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{tab.name}</span>
                        {tab.isDirty && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.path);
                          }}
                          className="hover:bg-neutral-700/50 p-0.5 rounded text-neutral-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Editor Quick Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleSaveActive}
                    title="Save File (Ctrl+S)"
                    className="p-1 hover:bg-[#2c2c2c] rounded text-neutral-400 hover:text-white"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab ? (
                  <Editor
                    height="100%"
                    language={getLanguage(activeTab.path)}
                    theme="vs-dark"
                    value={activeTab.content}
                    onChange={(val) => updateTabContent(activeTab.path, val || '')}
                    onMount={(editor) => setEditorInstance(editor)}
                    options={{
                      fontSize: preferences.fontSize || 13,
                      tabSize: preferences.tabSize || 2,
                      minimap: { enabled: preferences.minimap },
                      wordWrap: preferences.wordWrap ? 'on' : 'off',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs select-none">
                    <Code2 className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
                    <span>No file is currently open. Select a file from Explorer or press Ctrl+P.</span>
                    {!currentWorkspace && (
                      <button
                        onClick={() => setOpenFolderModalOpen(true)}
                        className="mt-3 px-3.5 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-neutral-200 text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Open Folder...</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bottom Terminal & Diagnostics Panel */}
          {isBottomPanelOpen && (
            <BottomPanel onClose={toggleBottomPanel} onOpenProblemFile={handleOpenFile} />
          )}
        </main>

        {/* Right AI Agent Panel */}
        {isAiPanelOpen && <AiAgentPanel onClose={toggleAiPanel} />}
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar
        activeLanguage={activeTab ? getLanguage(activeTab.path) : 'TypeScript'}
        branchName={activeBranch || 'main'}
        isRestricted={currentWorkspace?.isRestricted}
        onOpenTrustDialog={() => setTrustDialogOpen(true)}
        currentProjectId={currentProjectId || undefined}
        isSaving={isSaving}
      />

      {/* 4. Global Command Palette & Quick Open Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        files={[]}
        onOpenFile={handleOpenFile}
        context={{
          editorFocus: !!activeTabPath,
          folderOpen: !!currentWorkspace || !!currentProjectId,
          isSaving,
        }}
      />

      {/* 5. Modals and Notifications */}
      <OpenFolderModal />
      <TrustFolderDialog />
      <SettingsModal />
      <ToastContainer />
    </div>
  );
}
