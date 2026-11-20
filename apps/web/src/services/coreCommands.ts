import { commandRegistry, CommandDefinition } from '../services/commandRegistry';
import { useLayoutStore } from '../store/layoutStore';
import { useIdeStore } from '../store/ideStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';

export function initializeCoreCommands() {
  const commands: CommandDefinition[] = [
    // ─── File Menu Commands ──────────────────────────────────────────────
    {
      id: 'workbench.action.files.openFolder',
      title: 'Open Folder...',
      category: 'File',
      keybinding: 'Ctrl+K Ctrl+O',
      handler: () => {
        useWorkspaceStore.getState().setOpenFolderModalOpen(true);
      },
    },
    {
      id: 'workbench.action.files.openRecent',
      title: 'Open Recent Workspace...',
      category: 'File',
      handler: () => {
        useWorkspaceStore.getState().setOpenFolderModalOpen(true);
      },
    },
    {
      id: 'workbench.action.files.closeFolder',
      title: 'Close Workspace Folder',
      category: 'File',
      disabled: () => !useWorkspaceStore.getState().currentWorkspace,
      disabledReason: 'No folder is currently open',
      handler: () => {
        useWorkspaceStore.getState().closeWorkspace();
        usePreferencesStore.getState().addToast('Folder Closed', 'Workspace closed successfully.', 'info');
      },
    },
    {
      id: 'workbench.action.files.newFile',
      title: 'New File',
      category: 'File',
      keybinding: 'Ctrl+N',
      handler: () => {
        const { openFile } = useIdeStore.getState();
        const path = `untitled_${Date.now().toString().slice(-4)}.ts`;
        openFile(path, '// New file\n');
      },
    },
    {
      id: 'workbench.action.files.save',
      title: 'Save Current File',
      category: 'File',
      keybinding: 'Ctrl+S',
      disabled: (ctx) => !ctx.editorFocus && !useIdeStore.getState().activeTabPath,
      disabledReason: 'No active editor file to save',
      handler: async () => {
        const { activeTabPath, openTabs, markSaved, setIsSaving } = useIdeStore.getState();
        const { currentWorkspace } = useWorkspaceStore.getState();
        const active = openTabs.find((t) => t.path === activeTabPath);
        if (!active) return;

        setIsSaving(true);
        try {
          if (currentWorkspace) {
            // Write to real disk folder
            const res = await fetch('/api/fs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                root: currentWorkspace.rootPath,
                path: active.path,
                content: active.content,
              }),
            });
            if (res.ok) {
              markSaved(active.path);
              usePreferencesStore.getState().addToast('Saved', `${active.path} written to disk.`, 'success');
            } else {
              const err = await res.json();
              usePreferencesStore.getState().addToast('Save Failed', err.message || 'Cannot write to disk', 'error');
            }
          } else {
            // Memory / sandbox save
            markSaved(active.path);
            usePreferencesStore.getState().addToast('Saved', `${active.path} saved in memory.`, 'success');
          }
        } catch (err: any) {
          usePreferencesStore.getState().addToast('Save Error', err.message, 'error');
        } finally {
          setIsSaving(false);
        }
      },
    },
    {
      id: 'workbench.action.files.saveAll',
      title: 'Save All Files',
      category: 'File',
      keybinding: 'Ctrl+K S',
      handler: async () => {
        const { openTabs, markSaved } = useIdeStore.getState();
        const { currentWorkspace } = useWorkspaceStore.getState();
        const dirtyTabs = openTabs.filter((t) => t.isDirty);

        if (dirtyTabs.length === 0) {
          usePreferencesStore.getState().addToast('No Changes', 'All open files are saved.', 'info');
          return;
        }

        for (const tab of dirtyTabs) {
          if (currentWorkspace) {
            await fetch('/api/fs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                root: currentWorkspace.rootPath,
                path: tab.path,
                content: tab.content,
              }),
            });
          }
          markSaved(tab.path);
        }
        usePreferencesStore.getState().addToast('Save All', `${dirtyTabs.length} files saved.`, 'success');
      },
    },
    {
      id: 'workbench.action.workspace.trust',
      title: 'Manage Workspace Trust',
      category: 'Security',
      handler: () => {
        useWorkspaceStore.getState().setTrustDialogOpen(true);
      },
    },
    {
      id: 'workbench.action.toggleSidebar',
      title: 'Toggle Primary Sidebar',
      category: 'View',
      keybinding: 'Ctrl+B',
      handler: () => {
        useLayoutStore.getState().toggleSidebar();
      },
    },
    {
      id: 'workbench.action.toggleTerminal',
      title: 'Toggle Terminal Panel',
      category: 'View',
      keybinding: 'Ctrl+`',
      handler: () => {
        useLayoutStore.getState().toggleBottomPanel();
      },
    },
    {
      id: 'workbench.action.toggleAiPanel',
      title: 'Toggle AI Agent Panel',
      category: 'View',
      keybinding: 'Ctrl+Shift+A',
      handler: () => {
        useLayoutStore.getState().toggleAiPanel();
      },
    },
    {
      id: 'workbench.action.showCommands',
      title: 'Show All Commands (Command Palette)',
      category: 'View',
      keybinding: 'Ctrl+Shift+P',
      handler: () => {
        useLayoutStore.getState().openCommandPalette('>');
      },
    },
    {
      id: 'workbench.action.quickOpen',
      title: 'Quick Open (Go to File)',
      category: 'File',
      keybinding: 'Ctrl+P',
      handler: () => {
        useLayoutStore.getState().openCommandPalette('');
      },
    },
    {
      id: 'workbench.action.openSettings',
      title: 'Open Settings',
      category: 'Preferences',
      keybinding: 'Ctrl+,',
      handler: () => {
        usePreferencesStore.getState().openSettings();
      },
    },

    // ─── Edit Commands (Routed to Monaco instance) ──────────────────────
    {
      id: 'editor.action.undo',
      title: 'Undo',
      category: 'Edit',
      keybinding: 'Ctrl+Z',
      handler: () => useIdeStore.getState().triggerEditorAction('undo'),
    },
    {
      id: 'editor.action.redo',
      title: 'Redo',
      category: 'Edit',
      keybinding: 'Ctrl+Y',
      handler: () => useIdeStore.getState().triggerEditorAction('redo'),
    },
    {
      id: 'editor.action.formatDocument',
      title: 'Format Document',
      category: 'Edit',
      keybinding: 'Shift+Alt+F',
      handler: () => useIdeStore.getState().triggerEditorAction('format'),
    },
    {
      id: 'editor.action.gotoLine',
      title: 'Go to Line...',
      category: 'Go',
      keybinding: 'Ctrl+G',
      handler: () => useIdeStore.getState().triggerEditorAction('gotoLine'),
    },

    // ─── Activity Bar Views Switching ────────────────────────────────────
    {
      id: 'workbench.view.explorer',
      title: 'Focus on Explorer View',
      category: 'View',
      keybinding: 'Ctrl+Shift+E',
      handler: () => useLayoutStore.getState().setActiveSidebarTab('explorer'),
    },
    {
      id: 'workbench.view.search',
      title: 'Focus on Search in Workspace',
      category: 'View',
      keybinding: 'Ctrl+Shift+F',
      handler: () => useLayoutStore.getState().setActiveSidebarTab('search'),
    },
    {
      id: 'workbench.view.scm',
      title: 'Focus on Source Control & Git',
      category: 'View',
      keybinding: 'Ctrl+Shift+G',
      handler: () => useLayoutStore.getState().setActiveSidebarTab('git'),
    },
    {
      id: 'workbench.view.debug',
      title: 'Focus on Run & Testing',
      category: 'View',
      keybinding: 'Ctrl+Shift+D',
      handler: () => useLayoutStore.getState().setActiveSidebarTab('debug'),
    },
  ];

  commandRegistry.registerMany(commands);
}
