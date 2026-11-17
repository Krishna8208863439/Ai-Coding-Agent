import { create } from 'zustand';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
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

  setCurrentProjectId: (id: string | null) => void;
  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  closeAllTabs: () => void;
  setActiveTabPath: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  setIsSaving: (s: boolean) => void;
  markSaved: (path: string) => void;
  setDiagnostics: (d: WorkspaceDiagnostic[]) => void;
  setSearchFilter: (q: string) => void;
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

export const useIdeStore = create<IdeState>((set) => ({
  currentProjectId: initial.project,
  openTabs: initial.tabs,
  activeTabPath: initial.active,
  diagnostics: [
    {
      file: 'src/index.ts',
      line: 1,
      col: 1,
      message: 'Workspace initialized. TypeScript compiler service running.',
      severity: 'info',
    },
  ],
  isSaving: false,
  searchFilter: '',

  setCurrentProjectId: (currentProjectId) => {
    try {
      if (currentProjectId) localStorage.setItem(STORAGE_KEY_PROJECT, currentProjectId);
      else localStorage.removeItem(STORAGE_KEY_PROJECT);
    } catch {}
    set({ currentProjectId });
  },

  openFile: (path, content) =>
    set((state) => {
      const exists = state.openTabs.some((t) => t.path === path);
      if (exists) {
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE, path);
        } catch {}
        return { activeTabPath: path };
      }
      const name = path.split('/').pop() || path;
      const updatedTabs = [...state.openTabs, { path, name, content, isDirty: false }];
      try {
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(updatedTabs));
        localStorage.setItem(STORAGE_KEY_ACTIVE, path);
      } catch {}
      return {
        openTabs: updatedTabs,
        activeTabPath: path,
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
