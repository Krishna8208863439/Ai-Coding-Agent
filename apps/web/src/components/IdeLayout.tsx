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
import { useNavigate } from 'react-router-dom';
import { useIdeStore } from '../store/ideStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import {
  FileCode,
  X,
  Save,
  Play,
  RotateCcw,
  Sparkles,
  Columns,
  Code2,
} from 'lucide-react';

interface IdeLayoutProps {
  children?: React.ReactNode;
}

export function IdeLayout({ children }: IdeLayoutProps) {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
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

  // Layout states
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab | null>('explorer');
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [activeRole, setActiveRole] = useState('ARCHITECT');

  // File tree state
  const [files, setFiles] = useState<Array<{ path: string; isDir: boolean }>>([
    { path: 'src/index.ts', isDir: false },
    { path: 'src/app.ts', isDir: false },
    { path: 'src/components/App.tsx', isDir: false },
    { path: 'package.json', isDir: false },
    { path: 'README.md', isDir: false },
  ]);

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

  const handleOpenFile = (path: string) => {
    // If not open, open default content
    if (!openTabs.find((t) => t.path === path)) {
      openFile(path, `// ${path}\n// NEXORA AI Workspace Source File\n`);
    } else {
      setActiveTabPath(path);
    }
  };

  const handleSaveActive = async () => {
    if (!activeTab) return;
    setIsSaving(true);

    try {
      if (currentProjectId && accessToken) {
        await fetch(`/api/projects/${currentProjectId}/files/modify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
        });
      }
      markSaved(activeTab.path);
      addToast('File Saved', `${activeTab.path.split('/').pop()} saved to workspace.`, 'success');
    } catch {
      markSaved(activeTab.path);
    } finally {
      setIsSaving(false);
    }
  };

  // Load real files when currentProjectId changes
  const refreshProjectFiles = async () => {
    if (!currentProjectId || !accessToken) return;
    try {
      const res = await fetch(`/api/projects/${currentProjectId}/files`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          setFiles(data.files.map((f: any) => ({ path: f.path, isDir: f.isDir })));
        }
      }
    } catch {}
  };

  useEffect(() => {
    refreshProjectFiles();
  }, [currentProjectId, accessToken]);

  const handleCreateFile = async (newPath: string) => {
    setFiles((prev) => [...prev, { path: newPath, isDir: false }]);
    const defaultContent = `// Created by NEXORA AI\n`;
    openFile(newPath, defaultContent);

    if (currentProjectId && accessToken) {
      try {
        await fetch(`/api/projects/${currentProjectId}/files/modify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ path: newPath, content: defaultContent }),
        });
      } catch {}
    }
  };

  const handleCreateFolder = (folderPath: string) => {
    setFiles((prev) => [...prev, { path: folderPath, isDir: true }]);
    addToast('Folder Created', `Directory ${folderPath} added.`, 'info');
  };

  const handleDeleteFile = async (pathToDelete: string) => {
    setFiles((prev) => prev.filter((f) => f.path !== pathToDelete));
    closeTab(pathToDelete);

    if (currentProjectId && accessToken) {
      try {
        await fetch(`/api/projects/${currentProjectId}/files?path=${encodeURIComponent(pathToDelete)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        addToast('File Deleted', `${pathToDelete} removed from workspace.`, 'info');
      } catch {}
    }
  };

  // Ensure an initial file is open
  useEffect(() => {
    if (openTabs.length === 0 && files.length > 0) {
      handleOpenFile(files[0].path);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#171717] text-neutral-200 overflow-hidden select-none font-sans">
      {/* 1. VS Code-Style Top Navbar */}
      <TopNavbar
        currentProjectName="NEXORA AI Workspace"
        onToggleSidebar={() =>
          setActiveActivityTab((prev) => (prev ? null : 'explorer'))
        }
        onToggleAiPanel={() => setShowAiPanel((prev) => !prev)}
        onToggleBottomPanel={() => setShowBottomPanel((prev) => !prev)}
        onOpenSettings={openSettings}
        onNewFile={() => handleCreateFile(`src/untitled_${Date.now().toString().slice(-4)}.ts`)}
        onSaveFile={handleSaveActive}
        onOpenFile={handleOpenFile}
      />

      {/* 2. Main Middle Workspace Grid */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Activity Bar */}
        <ActivityBar
          activeTab={activeActivityTab}
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
            if (activeActivityTab === tab) {
              setActiveActivityTab(null);
            } else {
              setActiveActivityTab(tab);
            }
          }}
        />

        {/* Primary Sidebar (Explorer or secondary tools) */}
        {activeActivityTab === 'explorer' && (
          <ExplorerSidebar
            projectName="NEXORA Workspace"
            files={files}
            activeFilePath={activeTabPath || undefined}
            onOpenFile={handleOpenFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onRefresh={refreshProjectFiles}
          />
        )}

        {/* Source Control & GitHub Remote Sidebar */}
        {activeActivityTab === 'git' && (
          <SourceControlSidebar onOpenFile={handleOpenFile} />
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
                        className={`group flex items-center gap-2 px-3 py-1.5 text-xs border-r border-[#2d2d2d] cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#1e1e1e] text-cyan-300 border-t-2 border-t-cyan-400 font-medium'
                            : 'bg-[#181818] text-neutral-400 hover:bg-[#202020] hover:text-neutral-200'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate max-w-[140px] font-mono text-[11px]">
                          {tab.path.split('/').pop()}
                        </span>
                        {tab.isDirty && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.path);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Tab Bar Actions */}
                <div className="flex items-center gap-1 text-neutral-400">
                  <button
                    onClick={handleSaveActive}
                    title="Save File (Ctrl+S)"
                    className="p-1 hover:text-white hover:bg-[#282828] rounded transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Run Project in Sandbox"
                    className="p-1 hover:text-cyan-400 hover:bg-[#282828] rounded transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
                {activeTab ? (
                  <Editor
                    height="100%"
                    language={getLanguage(activeTab.path)}
                    value={activeTab.content}
                    onMount={(editor) => setEditorInstance(editor)}
                    onChange={(val) => updateTabContent(activeTab.path, val || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: true },
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      lineNumbers: 'on',
                      renderLineHighlight: 'all',
                      bracketPairColorization: { enabled: true },
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-8 text-center select-none">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-100 mb-1">NEXORA AI Workspace</h2>
                    <p className="text-xs text-neutral-400 max-w-md mb-6">
                      Autonomous AI Software Engineering IDE. Select a file from the explorer, open a command palette, or ask your AI Agent to build full-stack features.
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-sm w-full text-left">
                      <button
                        onClick={() => handleCreateFile(`src/feature_${Date.now().toString().slice(-4)}.ts`)}
                        className="p-3 bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] rounded-lg transition-colors group"
                      >
                        <span className="text-xs font-semibold text-neutral-200 block group-hover:text-cyan-400">
                          + New Source File
                        </span>
                        <span className="text-[10px] text-neutral-500">Create and edit code</span>
                      </button>
                      <button
                        onClick={() => navigate('/new-project')}
                        className="p-3 bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] rounded-lg transition-colors group"
                      >
                        <span className="text-xs font-semibold text-neutral-200 block group-hover:text-cyan-400">
                          📦 New Project
                        </span>
                        <span className="text-[10px] text-neutral-500">Prompt-to-App Generator</span>
                      </button>
                      <button
                        onClick={() => navigate('/api-manager')}
                        className="p-3 bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] rounded-lg transition-colors group"
                      >
                        <span className="text-xs font-semibold text-neutral-200 block group-hover:text-cyan-400">
                          🔌 Universal APIs
                        </span>
                        <span className="text-[10px] text-neutral-500">Connect external tokens</span>
                      </button>
                      <button
                        onClick={() => setShowAiPanel(true)}
                        className="p-3 bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] rounded-lg transition-colors group"
                      >
                        <span className="text-xs font-semibold text-neutral-200 block group-hover:text-cyan-400">
                          ✨ AI Autonomous Agent
                        </span>
                        <span className="text-[10px] text-neutral-500">Design, code & debug</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Retractable Bottom Panel */}
              {showBottomPanel && (
                <BottomPanel
                  onClose={() => setShowBottomPanel(false)}
                  onOpenProblemFile={handleOpenFile}
                />
              )}
            </>
          )}
        </main>

        {/* Right AI Agent Sidebar Panel */}
        {showAiPanel && (
          <AiAgentPanel
            activeRole={activeRole}
            onSelectRole={(r) => setActiveRole(r)}
            onClose={() => setShowAiPanel(false)}
          />
        )}
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar
        branchName="main"
        activeLanguage={activeTab ? getLanguage(activeTab.path).toUpperCase() : 'TYPESCRIPT'}
        isSaving={isSaving}
      />

      {/* Global Modals & Notifications */}
      <SettingsModal />
      <ToastContainer />
    </div>
  );
}
