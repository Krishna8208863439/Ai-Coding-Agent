import { commandRegistry, CommandDefinition } from '../services/commandRegistry';
import { useLayoutStore } from '../store/layoutStore';
import { useIdeStore } from '../store/ideStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';

export function initializeCoreCommands() {
  const commands: CommandDefinition[] = [
    // ─── File Menu Commands ───────────────────────────────────────────
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
      id: 'workbench.action.files.openFile',
      title: 'Open File...',
      category: 'File',
      keybinding: 'Ctrl+O',
      handler: () => {
        useLayoutStore.getState().openCommandPalette('');
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
      id: 'workbench.action.closeActiveEditor',
      title: 'Close Editor',
      category: 'File',
      keybinding: 'Ctrl+W',
      handler: () => {
        const { activeTabPath, closeTab } = useIdeStore.getState();
        if (activeTabPath) closeTab(activeTabPath);
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
      id: 'workbench.action.files.newFolder',
      title: 'New Folder',
      category: 'File',
      handler: () => {
        // Dispatches a custom event that ExplorerSidebar listens to
        window.dispatchEvent(new CustomEvent('nexora:newFolder'));
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
      id: 'workbench.action.files.saveAs',
      title: 'Save As...',
      category: 'File',
      keybinding: 'Ctrl+Shift+S',
      handler: () => {
        useLayoutStore.getState().openSaveAsModal();
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

    // ─── Layout / View Commands ───────────────────────────────────────
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
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('terminal');
        if (!isBottomPanelOpen) toggleBottomPanel();
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
    {
      id: 'workbench.action.toggleStatusBar',
      title: 'Toggle Status Bar',
      category: 'View',
      handler: () => {
        useLayoutStore.getState().toggleStatusBar();
      },
    },
    {
      id: 'workbench.action.toggleFullScreen',
      title: 'Toggle Full Screen',
      category: 'View',
      keybinding: 'F11',
      handler: () => {
        useLayoutStore.getState().toggleFullScreen();
      },
    },
    {
      id: 'workbench.action.zoomIn',
      title: 'Zoom In',
      category: 'View',
      keybinding: 'Ctrl+=',
      handler: () => {
        useLayoutStore.getState().zoomIn();
      },
    },
    {
      id: 'workbench.action.zoomOut',
      title: 'Zoom Out',
      category: 'View',
      keybinding: 'Ctrl+-',
      handler: () => {
        useLayoutStore.getState().zoomOut();
      },
    },
    {
      id: 'workbench.action.resetZoom',
      title: 'Reset Zoom',
      category: 'View',
      keybinding: 'Ctrl+0',
      handler: () => {
        useLayoutStore.getState().resetZoom();
      },
    },

    // ─── Bottom Panel Tab Switching ──────────────────────────────────
    {
      id: 'workbench.view.output',
      title: 'Open Output Panel',
      category: 'View',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('output');
        if (!isBottomPanelOpen) toggleBottomPanel();
      },
    },
    {
      id: 'workbench.view.problems',
      title: 'Open Problems Panel',
      category: 'View',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('problems');
        if (!isBottomPanelOpen) toggleBottomPanel();
      },
    },
    {
      id: 'workbench.view.debug',
      title: 'Open Debug Console',
      category: 'View',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('debug');
        if (!isBottomPanelOpen) toggleBottomPanel();
      },
    },
    {
      id: 'workbench.view.preview',
      title: 'Open Live Preview',
      category: 'View',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('preview');
        if (!isBottomPanelOpen) toggleBottomPanel();
      },
    },

    // ─── Help Commands ───────────────────────────────────────────────
    {
      id: 'workbench.action.openKeybindingsReference',
      title: 'Keyboard Shortcuts Reference',
      category: 'Help',
      keybinding: 'Ctrl+K Ctrl+S',
      handler: () => {
        useLayoutStore.getState().openKeybindingsModal();
      },
    },
    {
      id: 'workbench.action.showAbout',
      title: 'About NEXORA AI',
      category: 'Help',
      handler: () => {
        useLayoutStore.getState().openAboutModal();
      },
    },

    // ─── Edit Commands (Routed to Monaco instance) ───────────────────
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
      id: 'editor.action.cut',
      title: 'Cut',
      category: 'Edit',
      keybinding: 'Ctrl+X',
      handler: () => useIdeStore.getState().triggerEditorAction('cut'),
    },
    {
      id: 'editor.action.copy',
      title: 'Copy',
      category: 'Edit',
      keybinding: 'Ctrl+C',
      handler: () => useIdeStore.getState().triggerEditorAction('copy'),
    },
    {
      id: 'editor.action.paste',
      title: 'Paste',
      category: 'Edit',
      keybinding: 'Ctrl+V',
      handler: () => useIdeStore.getState().triggerEditorAction('paste'),
    },
    {
      id: 'editor.action.find',
      title: 'Find',
      category: 'Edit',
      keybinding: 'Ctrl+F',
      handler: () => useIdeStore.getState().triggerEditorAction('find'),
    },
    {
      id: 'editor.action.replace',
      title: 'Replace',
      category: 'Edit',
      keybinding: 'Ctrl+H',
      handler: () => useIdeStore.getState().triggerEditorAction('replace'),
    },
    {
      id: 'editor.action.findInFiles',
      title: 'Find in Files',
      category: 'Edit',
      keybinding: 'Ctrl+Shift+F',
      handler: () => {
        // Open search sidebar
        useLayoutStore.getState().setActiveSidebarTab('search');
      },
    },
    {
      id: 'editor.action.replaceInFiles',
      title: 'Replace in Files',
      category: 'Edit',
      keybinding: 'Ctrl+Shift+H',
      handler: () => {
        useLayoutStore.getState().setActiveSidebarTab('search');
      },
    },
    {
      id: 'editor.action.formatDocument',
      title: 'Format Document',
      category: 'Edit',
      keybinding: 'Shift+Alt+F',
      handler: () => useIdeStore.getState().triggerEditorAction('format'),
    },
    {
      id: 'editor.action.toggleLineComment',
      title: 'Toggle Line Comment',
      category: 'Edit',
      keybinding: 'Ctrl+/',
      handler: () => useIdeStore.getState().triggerEditorAction('toggleLineComment'),
    },

    // ─── Selection Commands ──────────────────────────────────────────
    {
      id: 'editor.action.selectAll',
      title: 'Select All',
      category: 'Selection',
      keybinding: 'Ctrl+A',
      handler: () => useIdeStore.getState().triggerEditorAction('selectAll'),
    },
    {
      id: 'editor.action.expandSelection',
      title: 'Expand Selection',
      category: 'Selection',
      keybinding: 'Shift+Alt+Right',
      handler: () => useIdeStore.getState().triggerEditorAction('expandSelection'),
    },
    {
      id: 'editor.action.shrinkSelection',
      title: 'Shrink Selection',
      category: 'Selection',
      keybinding: 'Shift+Alt+Left',
      handler: () => useIdeStore.getState().triggerEditorAction('shrinkSelection'),
    },
    {
      id: 'editor.action.addCursorAbove',
      title: 'Add Cursor Above',
      category: 'Selection',
      keybinding: 'Ctrl+Alt+Up',
      handler: () => useIdeStore.getState().triggerEditorAction('addCursorAbove'),
    },
    {
      id: 'editor.action.addCursorBelow',
      title: 'Add Cursor Below',
      category: 'Selection',
      keybinding: 'Ctrl+Alt+Down',
      handler: () => useIdeStore.getState().triggerEditorAction('addCursorBelow'),
    },
    {
      id: 'editor.action.copyLineUp',
      title: 'Copy Line Up',
      category: 'Selection',
      keybinding: 'Shift+Alt+Up',
      handler: () => useIdeStore.getState().triggerEditorAction('copyLineUp'),
    },
    {
      id: 'editor.action.copyLineDown',
      title: 'Copy Line Down',
      category: 'Selection',
      keybinding: 'Shift+Alt+Down',
      handler: () => useIdeStore.getState().triggerEditorAction('copyLineDown'),
    },
    {
      id: 'editor.action.moveLineUp',
      title: 'Move Line Up',
      category: 'Selection',
      keybinding: 'Alt+Up',
      handler: () => useIdeStore.getState().triggerEditorAction('moveLineUp'),
    },
    {
      id: 'editor.action.moveLineDown',
      title: 'Move Line Down',
      category: 'Selection',
      keybinding: 'Alt+Down',
      handler: () => useIdeStore.getState().triggerEditorAction('moveLineDown'),
    },

    // ─── Go Commands ─────────────────────────────────────────────────
    {
      id: 'workbench.action.navigateBack',
      title: 'Go Back',
      category: 'Go',
      keybinding: 'Alt+Left',
      handler: () => useIdeStore.getState().triggerEditorAction('navigateBack'),
    },
    {
      id: 'workbench.action.navigateForward',
      title: 'Go Forward',
      category: 'Go',
      keybinding: 'Alt+Right',
      handler: () => useIdeStore.getState().triggerEditorAction('navigateForward'),
    },
    {
      id: 'editor.action.gotoLine',
      title: 'Go to Line...',
      category: 'Go',
      keybinding: 'Ctrl+G',
      handler: () => useIdeStore.getState().triggerEditorAction('gotoLine'),
    },
    {
      id: 'workbench.action.gotoSymbol',
      title: 'Go to Symbol in Workspace...',
      category: 'Go',
      keybinding: 'Ctrl+Shift+O',
      handler: () => useLayoutStore.getState().openCommandPalette('@'),
    },

    // ─── Activity Bar Views Switching ────────────────────────────────
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

    // ─── Run / Debug Commands ────────────────────────────────────────
    {
      id: 'workbench.action.debug.start',
      title: 'Start Debugging',
      category: 'Run',
      keybinding: 'F5',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('debug');
        if (!isBottomPanelOpen) toggleBottomPanel();
        window.dispatchEvent(new CustomEvent('nexora:debug:start'));
      },
    },
    {
      id: 'workbench.action.debug.run',
      title: 'Run Without Debugging',
      category: 'Run',
      keybinding: 'Ctrl+F5',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('terminal');
        if (!isBottomPanelOpen) toggleBottomPanel();
        window.dispatchEvent(new CustomEvent('nexora:run:start'));
      },
    },
    {
      id: 'workbench.action.debug.stop',
      title: 'Stop',
      category: 'Run',
      keybinding: 'Shift+F5',
      handler: () => {
        window.dispatchEvent(new CustomEvent('nexora:run:stop'));
      },
    },
    {
      id: 'workbench.action.debug.restart',
      title: 'Restart',
      category: 'Run',
      keybinding: 'Ctrl+Shift+F5',
      handler: () => {
        window.dispatchEvent(new CustomEvent('nexora:run:restart'));
      },
    },

    // ─── Terminal Commands ───────────────────────────────────────────
    {
      id: 'workbench.action.terminal.new',
      title: 'New Terminal',
      category: 'Terminal',
      keybinding: 'Ctrl+Shift+`',
      handler: () => {
        const { isBottomPanelOpen, toggleBottomPanel, setActiveBottomPanelTab } = useLayoutStore.getState();
        setActiveBottomPanelTab('terminal');
        if (!isBottomPanelOpen) toggleBottomPanel();
        window.dispatchEvent(new CustomEvent('nexora:terminal:new'));
      },
    },
    {
      id: 'workbench.action.terminal.split',
      title: 'Split Terminal',
      category: 'Terminal',
      handler: () => {
        window.dispatchEvent(new CustomEvent('nexora:terminal:split'));
      },
    },
    {
      id: 'workbench.action.terminal.runSelectedText',
      title: 'Run Selected Text in Terminal',
      category: 'Terminal',
      handler: () => {
        // Dispatches event; BottomPanel terminal picks it up with document.getSelection
        window.dispatchEvent(new CustomEvent('nexora:terminal:runSelectedText'));
      },
    },
    {
      id: 'workbench.action.terminal.clear',
      title: 'Clear Terminal',
      category: 'Terminal',
      handler: () => {
        window.dispatchEvent(new CustomEvent('nexora:terminal:clear'));
      },
    },
  ];

  commandRegistry.registerMany(commands);
}
