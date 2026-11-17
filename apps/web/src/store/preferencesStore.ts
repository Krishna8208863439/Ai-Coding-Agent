import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastNotification {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  durationMs?: number;
  timestamp: string;
}

export interface UserPreferences {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  autoSave: boolean;
  telemetry: boolean;
  activeAiProvider: string;
}

interface PreferencesState {
  preferences: UserPreferences;
  toasts: ToastNotification[];
  isSettingsOpen: boolean;
  isCommandPaletteOpen: boolean;

  setPreferences: (p: Partial<UserPreferences>) => void;
  addToast: (title: string, description?: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

const STORAGE_KEY = 'nexora_user_preferences';

const defaultPreferences: UserPreferences = {
  theme: 'vs-dark',
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  telemetry: false,
  activeAiProvider: 'gemini',
};

const loadSavedPreferences = (): UserPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {}
  return defaultPreferences;
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  preferences: loadSavedPreferences(),
  toasts: [],
  isSettingsOpen: false,
  isCommandPaletteOpen: false,

  setPreferences: (partial) => {
    const updated = { ...get().preferences, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ preferences: updated });
  },

  addToast: (title, description, type = 'info', durationMs = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastNotification = {
      id,
      title,
      description,
      type,
      durationMs,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    if (durationMs > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, durationMs);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => set({ toasts: [] }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
}));
