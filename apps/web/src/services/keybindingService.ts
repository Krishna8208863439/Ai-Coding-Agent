import { useEffect } from 'react';
import { commandRegistry, CommandContext } from './commandRegistry';

export function normalizeKeyCombination(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
    return '';
  }

  // Normalize special keys
  if (key === '`') key = '`';
  else if (key === ',') key = ',';
  else if (key === 'Escape') key = 'Escape';
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join('+');
}

export function useGlobalKeybindings(getContext: () => CommandContext) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in standard inputs unless it's a major shortcut like Ctrl+Shift+P, Ctrl+P, Ctrl+S
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      const combo = normalizeKeyCombination(e);
      if (!combo) return;

      // Critical shortcuts always work
      const alwaysAllowed = ['Ctrl+Shift+P', 'Ctrl+P', 'Ctrl+S', 'Ctrl+B', 'Ctrl+`', 'Escape'];
      if (isInput && !alwaysAllowed.includes(combo)) {
        return;
      }

      const commands = commandRegistry.getAll();
      const matched = commands.find(
        (c) => c.keybinding?.toLowerCase() === combo.toLowerCase()
      );

      if (matched) {
        const ctx = getContext();
        if (matched.whenClause && !matched.whenClause(ctx)) {
          return;
        }
        if (matched.disabled && matched.disabled(ctx)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        commandRegistry.execute(matched.id, ctx);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [getContext]);
}
