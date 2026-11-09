import { create } from 'zustand';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
}

interface IdeState {
  currentProjectId: string | null;
  openTabs: OpenTab[];
  activeTabPath: string | null;
  diagnostics: string[];
  isSaving: boolean;

  setCurrentProjectId: (id: string | null) => void;
  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTabPath: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  setIsSaving: (s: boolean) => void;
  markSaved: (path: string) => void;
}

export const useIdeStore = create<IdeState>((set) => ({
  currentProjectId: null,
  openTabs: [],
  activeTabPath: null,
  diagnostics: ['Workspace clean. All syntax checks operational.'],
  isSaving: false,

  setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),

  openFile: (path, content) =>
    set((state) => {
      const exists = state.openTabs.some((t) => t.path === path);
      if (exists) {
        return { activeTabPath: path };
      }
      const name = path.split('/').pop() || path;
      return {
        openTabs: [...state.openTabs, { path, name, content, isDirty: false }],
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
      return { openTabs: remaining, activeTabPath: newActive };
    }),

  setActiveTabPath: (activeTabPath) => set({ activeTabPath }),

  updateTabContent: (path, content) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.path === path ? { ...t, content, isDirty: true } : t
      ),
    })),

  setIsSaving: (isSaving) => set({ isSaving }),

  markSaved: (path) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.path === path ? { ...t, isDirty: false } : t
      ),
    })),
}));

