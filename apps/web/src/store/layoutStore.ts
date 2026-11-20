import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActivityTab } from '../components/ActivityBar';

interface LayoutState {
  activeSidebarTab: ActivityTab | null;
  isSidebarOpen: boolean;
  isBottomPanelOpen: boolean;
  isAiPanelOpen: boolean;
  isCommandPaletteOpen: boolean;
  commandPaletteInitialMode: '>' | '' | ':' | '@';
  sidebarWidth: number;
  bottomPanelHeight: number;
  aiPanelWidth: number;

  setActiveSidebarTab: (tab: ActivityTab | null) => void;
  toggleSidebar: () => void;
  toggleBottomPanel: () => void;
  toggleAiPanel: () => void;
  openCommandPalette: (initialMode?: '>' | '' | ':' | '@') => void;
  closeCommandPalette: () => void;
  setSidebarWidth: (w: number) => void;
  setBottomPanelHeight: (h: number) => void;
  setAiPanelWidth: (w: number) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      activeSidebarTab: 'explorer',
      isSidebarOpen: true,
      isBottomPanelOpen: true,
      isAiPanelOpen: true,
      isCommandPaletteOpen: false,
      commandPaletteInitialMode: '>',
      sidebarWidth: 260,
      bottomPanelHeight: 256,
      aiPanelWidth: 430,

      setActiveSidebarTab: (tab) => {
        const current = get().activeSidebarTab;
        if (current === tab) {
          // Toggle collapsed
          set({ activeSidebarTab: null, isSidebarOpen: false });
        } else {
          set({ activeSidebarTab: tab, isSidebarOpen: true });
        }
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

      openCommandPalette: (initialMode = '>') =>
        set({ isCommandPaletteOpen: true, commandPaletteInitialMode: initialMode }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),
      setAiPanelWidth: (w) => set({ aiPanelWidth: w }),
    }),
    {
      name: 'nexora_layout_storage',
      partialize: (state) => ({
        activeSidebarTab: state.activeSidebarTab,
        isSidebarOpen: state.isSidebarOpen,
        isBottomPanelOpen: state.isBottomPanelOpen,
        isAiPanelOpen: state.isAiPanelOpen,
        sidebarWidth: state.sidebarWidth,
        bottomPanelHeight: state.bottomPanelHeight,
        aiPanelWidth: state.aiPanelWidth,
      }),
    }
  )
);
