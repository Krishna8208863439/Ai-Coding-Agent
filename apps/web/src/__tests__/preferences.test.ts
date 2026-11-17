import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferencesStore } from '../store/preferencesStore';

describe('Preferences & Notification System Store', () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      toasts: [],
      isSettingsOpen: false,
      isCommandPaletteOpen: false,
      preferences: {
        theme: 'vs-dark',
        fontSize: 13,
        tabSize: 2,
        wordWrap: true,
        minimap: true,
        autoSave: true,
        telemetry: false,
        activeAiProvider: 'gemini',
      },
    });
  });

  it('updates user preferences in store', () => {
    const store = usePreferencesStore.getState();
    store.setPreferences({ fontSize: 16, autoSave: false, theme: 'hc-black' });

    const updated = usePreferencesStore.getState().preferences;
    expect(updated.fontSize).toBe(16);
    expect(updated.autoSave).toBe(false);
    expect(updated.theme).toBe('hc-black');
  });

  it('adds and removes toast notifications', () => {
    const store = usePreferencesStore.getState();
    store.addToast('Build Complete', 'All 1,637 modules compiled clean.', 'success', 0);

    const toasts = usePreferencesStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].title).toBe('Build Complete');
    expect(toasts[0].type).toBe('success');

    store.removeToast(toasts[0].id);
    expect(usePreferencesStore.getState().toasts.length).toBe(0);
  });

  it('opens and closes settings modal', () => {
    const store = usePreferencesStore.getState();
    expect(store.isSettingsOpen).toBe(false);

    store.openSettings();
    expect(usePreferencesStore.getState().isSettingsOpen).toBe(true);

    store.closeSettings();
    expect(usePreferencesStore.getState().isSettingsOpen).toBe(false);
  });

  it('toggles command palette state', () => {
    const store = usePreferencesStore.getState();
    expect(store.isCommandPaletteOpen).toBe(false);

    store.toggleCommandPalette();
    expect(usePreferencesStore.getState().isCommandPaletteOpen).toBe(true);

    store.closeCommandPalette();
    expect(usePreferencesStore.getState().isCommandPaletteOpen).toBe(false);
  });
});
