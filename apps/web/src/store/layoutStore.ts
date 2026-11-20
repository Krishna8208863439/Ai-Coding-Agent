import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActivityTab } from '../components/ActivityBar';

export type BottomPanelTab = 'terminal' | 'output' | 'problems' | 'debug' | 'preview';

interface LayoutState {
  activeSidebarTab: ActivityTab | null;
  activeBottomPanelTab: BottomPanelTab;
  isSidebarOpen: boolean;
  isBottomPanelOpen: boolean;
  isAiPanelOpen: boolean;
  isStatusBarVisible: boolean;
  isCommandPaletteOpen: boolean;
  commandPaletteInitialMode: '>' | '' | ':' | '@' | '#';
  sidebarWidth: number;
  bottomPanelHeight: number;
  aiPanelWidth: number;
  zoomLevel: number;

  // Modals
  isAboutModalOpen: boolean;
  isKeybindingsModalOpen: boolean;
  isSaveAsModalOpen: boolean;

  setActiveSidebarTab: (tab: ActivityTab | null) => void;
  setActiveBottomPanelTab: (tab: BottomPanelTab) => void;
  toggleSidebar: () => void;
  toggleBottomPanel: () => void;
  toggleAiPanel: () => void;
  toggleStatusBar: () => void;
  toggleFullScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  openCommandPalette: (initialMode?: '>' | '' | ':' | '@' | '#') => void;
  closeCommandPalette: () => void;
  setSidebarWidth: (w: number) => void;
  setBottomPanelHeight: (h: number) => void;
  setAiPanelWidth: (w: number) => void;

  openAboutModal: () => void;
  closeAboutModal: () => void;
  openKeybindingsModal: () => void;
  closeKeybindingsModal: () => void;
  openSaveAsModal: () => void;
  closeSaveAsModal: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      activeSidebarTab: 'explorer',
      activeBottomPanelTab: 'terminal',
      isSidebarOpen: true,
      isBottomPanelOpen: true,
      isAiPanelOpen: true,
      isStatusBarVisible: true,
      isCommandPaletteOpen: false,
      commandPaletteInitialMode: '>',
      sidebarWidth: 260,
      bottomPanelHeight: 256,
      aiPanelWidth: 430,
      zoomLevel: 1.0,

      isAboutModalOpen: false,
      isKeybindingsModalOpen: false,
      isSaveAsModalOpen: false,

      setActiveSidebarTab: (tab) => {
        const current = get().activeSidebarTab;
        if (current === tab) {
          set({ activeSidebarTab: null, isSidebarOpen: false });
        } else {
          set({ activeSidebarTab: tab, isSidebarOpen: true });
        }
      },

      setActiveBottomPanelTab: (tab) => {
        set({ activeBottomPanelTab: tab, isBottomPanelOpen: true });
      },

      toggleSidebar: () => {
        const { isSidebarOpen, activeSidebarTab } = get();
        if (isSidebarOpen) {
          set({ isSidebarOpen: false });
        } else {
          set({ isSidebarOpen: true, activeSidebarTab: activeSidebarTab || 'explorer' });
        }
      },

      toggleBottomPanel: () => set((state) => ({ isBottomPanelOpen: !state.isBottomPanelOpen })),
      toggleAiPanel: () => set((state) => ({ isAiPanelOpen: !state.isAiPanelOpen })),
      toggleStatusBar: () => set((state) => ({ isStatusBarVisible: !state.isStatusBarVisible })),

      toggleFullScreen: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      },

      zoomIn: () =>
        set((state) => ({
          zoomLevel: Math.min(Number((state.zoomLevel + 0.1).toFixed(1)), 1.5),
        })),

      zoomOut: () =>
        set((state) => ({
          zoomLevel: Math.max(Number((state.zoomLevel - 0.1).toFixed(1)), 0.7),
        })),

      resetZoom: () => set({ zoomLevel: 1.0 }),

      openCommandPalette: (initialMode = '>') =>
        set({ isCommandPaletteOpen: true, commandPaletteInitialMode: initialMode }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),
      setAiPanelWidth: (w) => set({ aiPanelWidth: w }),

      openAboutModal: () => set({ isAboutModalOpen: true }),
      closeAboutModal: () => set({ isAboutModalOpen: false }),
      openKeybindingsModal: () => set({ isKeybindingsModalOpen: true }),
      closeKeybindingsModal: () => set({ isKeybindingsModalOpen: false }),
      openSaveAsModal: () => set({ isSaveAsModalOpen: true }),
      closeSaveAsModal: () => set({ isSaveAsModalOpen: false }),
    }),
    {
      name: 'nexora_layout_storage',
      partialize: (state) => ({
        activeSidebarTab: state.activeSidebarTab,
        activeBottomPanelTab: state.activeBottomPanelTab,
        isSidebarOpen: state.isSidebarOpen,
        isBottomPanelOpen: state.isBottomPanelOpen,
        isAiPanelOpen: state.isAiPanelOpen,
        isStatusBarVisible: state.isStatusBarVisible,
        sidebarWidth: state.sidebarWidth,
        bottomPanelHeight: state.bottomPanelHeight,
        aiPanelWidth: state.aiPanelWidth,
        zoomLevel: state.zoomLevel,
      }),
    }
  )
);
