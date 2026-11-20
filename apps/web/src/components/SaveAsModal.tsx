import React, { useState, useEffect } from 'react';
import { X, Save, FileCode } from 'lucide-react';
import { useLayoutStore } from '../store/layoutStore';
import { useIdeStore } from '../store/ideStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';

export function SaveAsModal() {
  const { isSaveAsModalOpen, closeSaveAsModal } = useLayoutStore();
  const { activeTabPath, openTabs, openFile } = useIdeStore();
  const { currentWorkspace, fetchFileTree } = useWorkspaceStore();
  const { addToast } = usePreferencesStore();

  const [newPath, setNewPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSaveAsModalOpen && activeTabPath) {
      setNewPath(activeTabPath);
    }
  }, [isSaveAsModalOpen, activeTabPath]);

  if (!isSaveAsModalOpen) return null;

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim() || !activeTab) return;

    setIsSaving(true);
    const targetPath = newPath.trim();

    try {
      if (currentWorkspace) {
        const res = await fetch('/api/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            root: currentWorkspace.rootPath,
            path: targetPath,
            content: activeTab.content,
          }),
        });

        if (res.ok) {
          addToast('Saved As', `${targetPath} written to disk.`, 'success');
          await fetchFileTree('');
          openFile(targetPath, activeTab.content);
          closeSaveAsModal();
        } else {
          const err = await res.json();
          addToast('Save As Failed', err.message || 'Cannot write file', 'error');
        }
      } else {
        openFile(targetPath, activeTab.content);
        addToast('Saved As', `${targetPath} saved in memory.`, 'success');
        closeSaveAsModal();
      }
    } catch (err: any) {
      addToast('Error', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-neutral-200 text-xs">
        <div className="p-3 bg-[#252526] border-b border-[#333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-neutral-100">Save As...</h3>
          </div>
          <button
            onClick={closeSaveAsModal}
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-neutral-400 text-[11px] mb-1">
              File Path (relative to workspace root):
            </label>
            <input
              autoFocus
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="w-full bg-[#121212] border border-[#383838] focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeSaveAsModal}
              className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-neutral-300 rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newPath.trim()}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium disabled:opacity-40"
            >
              {isSaving ? 'Saving...' : 'Save File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
