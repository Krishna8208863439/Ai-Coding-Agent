import { create } from 'zustand';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
  isDiff?: boolean;
  diffInfo?: {
    original: string;
    modified: string;
    staged?: boolean;
  };
}

export interface WorkspaceDiagnostic {
  file: string;
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface IdeState {
  currentProjectId: string | null;
  openTabs: OpenTab[];
  activeTabPath: string | null;
  diagnostics: WorkspaceDiagnostic[];
  isSaving: boolean;
  searchFilter: string;
  editorInstance: any | null;

  setCurrentProjectId: (id: string | null) => void;
  openFile: (path: string, content: string) => void;
  openDiffTab: (path: string, original: string, modified: string, staged?: boolean) => void;
  closeTab: (path: string) => void;
  closeAllTabs: () => void;
  setActiveTabPath: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  setIsSaving: (s: boolean) => void;
  markSaved: (path: string) => void;
  setDiagnostics: (d: WorkspaceDiagnostic[]) => void;
  setSearchFilter: (q: string) => void;
  setEditorInstance: (editor: any) => void;

  // Global Editor Actions
  triggerEditorAction: (actionId: string) => void;
}

const STORAGE_KEY_TABS = 'nexora_open_tabs';
const STORAGE_KEY_ACTIVE = 'nexora_active_tab';
const STORAGE_KEY_PROJECT = 'nexora_current_project';

// Restore saved workspace session if present
const restoreInitialState = () => {
  try {
    const savedTabs = localStorage.getItem(STORAGE_KEY_TABS);
    const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const savedProject = localStorage.getItem(STORAGE_KEY_PROJECT);

    return {
      tabs: savedTabs ? JSON.parse(savedTabs) : [],
      active: savedActive || null,
      project: savedProject || null,
    };
  } catch {
    return { tabs: [], active: null, project: null };
  }
};

const initial = restoreInitialState();

export const useIdeStore = create<IdeState>((set, get) => ({
  currentProjectId: initial.project,
  openTabs: initial.tabs,
  activeTabPath: initial.active,
  diagnostics: [],
  isSaving: false,
  searchFilter: '',
  editorInstance: null,

  setCurrentProjectId: (currentProjectId) => {
    try {
      if (currentProjectId) {
        localStorage.setItem(STORAGE_KEY_PROJECT, currentProjectId);
      } else {
        localStorage.removeItem(STORAGE_KEY_PROJECT);
      }
    } catch {}
    set({ currentProjectId });
  },

  setEditorInstance: (editorInstance) => set({ editorInstance }),

  triggerEditorAction: (actionId: string) => {
    const editor = get().editorInstance;
    if (!editor) return;

    try {
      if (actionId === 'undo') {
        editor.trigger('menu', 'undo', null);
      } else if (actionId === 'redo') {
        editor.trigger('menu', 'redo', null);
      } else if (actionId === 'find') {
        editor.trigger('menu', 'actions.find', null);
      } else if (actionId === 'replace') {
        editor.getAction('editor.action.startFindReplaceAction')?.run();
      } else if (actionId === 'format') {
        editor.getAction('editor.action.formatDocument')?.run();
      } else if (actionId === 'selectAll') {
        editor.setSelection(editor.getModel()?.getFullModelRange());
      } else if (actionId === 'gotoLine') {
        editor.getAction('editor.action.gotoLine')?.run();
      } else if (actionId === 'copyLineUp') {
        editor.getAction('editor.action.copyLinesUpAction')?.run();
      } else if (actionId === 'copyLineDown') {
        editor.getAction('editor.action.copyLinesDownAction')?.run();
      } else {
        editor.getAction(actionId)?.run();
      }
    } catch {}
  },

  openFile: (path, content) =>
    set((state) => {
      const existing = state.openTabs.find((t) => t.path === path);
      if (existing) {
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE, path);
        } catch {}
        return { activeTabPath: path };
      }

      const name = path.split('/').pop() || path;
      const newTabs = [...state.openTabs, { path, name, content, isDirty: false }];
      try {
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(newTabs));
        localStorage.setItem(STORAGE_KEY_ACTIVE, path);
      } catch {}
      return {
        openTabs: newTabs,
        activeTabPath: path,
      };
    }),

  openDiffTab: (path, original, modified, staged = false) =>
    set((state) => {
      const diffPath = `[DIFF] ${path}`;
      const existing = state.openTabs.find((t) => t.path === diffPath);
      if (existing) {
        // Update diffInfo
        const updated = state.openTabs.map((t) =>
          t.path === diffPath
            ? { ...t, diffInfo: { original, modified, staged } }
            : t
        );
        return { openTabs: updated, activeTabPath: diffPath };
      }

      const fileName = path.split('/').pop() || path;
      const newTab: OpenTab = {
        path: diffPath,
        name: `${fileName} (Working Tree)`,
        content: modified,
        isDiff: true,
        diffInfo: { original, modified, staged },
      };

      const newTabs = [...state.openTabs, newTab];
      return {
        openTabs: newTabs,
        activeTabPath: diffPath,
      };
    }),

  closeTab: (path) =>
    set((state) => {
      const remaining = state.openTabs.filter((t) => t.path !== path);
      let newActive = state.activeTabPath;
      if (state.activeTabPath === path) {
        newActive = remaining.length > 0 ? remaining[remaining.length - 1].path : null;
      }
      try {
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(remaining));
        if (newActive) localStorage.setItem(STORAGE_KEY_ACTIVE, newActive);
        else localStorage.removeItem(STORAGE_KEY_ACTIVE);
      } catch {}
      return { openTabs: remaining, activeTabPath: newActive };
    }),

  closeAllTabs: () => {
    try {
      localStorage.removeItem(STORAGE_KEY_TABS);
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } catch {}
    set({ openTabs: [], activeTabPath: null });
  },

  setActiveTabPath: (activeTabPath) => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeTabPath);
    } catch {}
    set({ activeTabPath });
  },

  updateTabContent: (path, content) =>
    set((state) => {
      const updatedTabs = state.openTabs.map((t) =>
        t.path === path ? { ...t, content, isDirty: true } : t
      );
      try {
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(updatedTabs));
      } catch {}
      return { openTabs: updatedTabs };
    }),

  setIsSaving: (isSaving) => set({ isSaving }),

  markSaved: (path) =>
    set((state) => {
      const updatedTabs = state.openTabs.map((t) =>
        t.path === path ? { ...t, isDirty: false } : t
      );
      try {
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(updatedTabs));
      } catch {}
      return { openTabs: updatedTabs };
    }),

  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setSearchFilter: (searchFilter) => set({ searchFilter }),
}));
