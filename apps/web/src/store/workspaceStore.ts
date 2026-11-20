import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useIdeStore } from './ideStore';

export interface WorkspaceFileNode {
  name: string;
  path: string; // relative to root
  isDir: boolean;
  size: number;
  readable: boolean;
  ignored?: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  children?: WorkspaceFileNode[];
}

export interface RecentWorkspaceItem {
  id: string;
  name: string;
  path: string;
  isPinned: boolean;
  trusted: boolean;
  lastOpenedAt: string;
  exists: boolean;
}

export interface WorkspaceInfo {
  rootPath: string;
  name: string;
  trusted: boolean;
  isRestricted: boolean;
  projectId?: string;
}

interface WorkspaceState {
  currentWorkspace: WorkspaceInfo | null;
  activeBranch: string | null;
  fileTree: WorkspaceFileNode[];
  recentWorkspaces: RecentWorkspaceItem[];
  isOpenFolderModalOpen: boolean;
  isTrustDialogOpen: boolean;
  pendingConflict: { path: string; diskContent: string } | null;
  wsConnected: boolean;

  // Actions
  openWorkspace: (path: string, confirmHome?: boolean) => Promise<{ success: boolean; error?: string; isHomeDir?: boolean }>;
  trustCurrentWorkspace: () => Promise<void>;
  setRestrictedMode: (restricted: boolean) => void;
  closeWorkspace: () => void;
  fetchRecentWorkspaces: () => Promise<void>;
  fetchFileTree: (subpath?: string) => Promise<void>;
  toggleFolderExpand: (folderPath: string) => Promise<void>;
  setActiveBranch: (branch: string | null) => void;
  fetchGitBranch: () => Promise<void>;
  setOpenFolderModalOpen: (open: boolean) => void;
  setTrustDialogOpen: (open: boolean) => void;
  setPendingConflict: (conflict: { path: string; diskContent: string } | null) => void;
  initWebSocket: () => void;
}

const STORAGE_KEY_LAST_WORKSPACE = 'nexora_last_workspace_root';

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  activeBranch: null,
  fileTree: [],
  recentWorkspaces: [],
  isOpenFolderModalOpen: false,
  isTrustDialogOpen: false,
  pendingConflict: null,
  wsConnected: false,

  openWorkspace: async (targetPath: string, confirmHome = false) => {
    const { accessToken } = useAuthStore.getState();
    const token = accessToken || 'dev';

    try {
      const res = await fetch('/api/workspace/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: targetPath, confirmHome }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'HOME_DIR_CONFIRMATION_REQUIRED') {
          return { success: false, error: data.message, isHomeDir: true };
        }
        return { success: false, error: data.message || data.error || 'Failed to open workspace' };
      }

      const rootPath = data.rootPath || targetPath;
      const name = data.name || data.project?.name || rootPath.split(/[/\\]/).pop() || 'Workspace';
      const isTrusted = !!data.trusted;

      const workspaceInfo: WorkspaceInfo = {
        rootPath,
        name,
        trusted: isTrusted,
        isRestricted: !isTrusted,
        projectId: data.project?.id,
      };

      try {
        localStorage.setItem(STORAGE_KEY_LAST_WORKSPACE, rootPath);
      } catch {}

      // Update IDE store project ID so tasks/files sync
      useIdeStore.getState().setCurrentProjectId(data.project?.id || 'local');

      // Update window title
      document.title = `${name} - NEXORA AI`;

      set({
        currentWorkspace: workspaceInfo,
        isOpenFolderModalOpen: false,
        isTrustDialogOpen: !isTrusted,
      });

      // Fetch initial file tree and git info
      await get().fetchFileTree('');
      await get().fetchGitBranch();
      await get().fetchRecentWorkspaces();

      // Subscribe to WebSocket watcher
      get().initWebSocket();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error opening workspace' };
    }
  },

  trustCurrentWorkspace: async () => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;

    const { accessToken } = useAuthStore.getState();
    const token = accessToken || 'dev';

    try {
      const res = await fetch('/api/workspace/trust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: currentWorkspace.projectId,
          rootPath: currentWorkspace.rootPath,
        }),
      });

      if (res.ok) {
        set({
          currentWorkspace: {
            ...currentWorkspace,
            trusted: true,
            isRestricted: false,
          },
          isTrustDialogOpen: false,
        });
      }
    } catch {}
  },

  setRestrictedMode: (restricted: boolean) => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;
    set({
      currentWorkspace: {
        ...currentWorkspace,
        isRestricted: restricted,
      },
      isTrustDialogOpen: false,
    });
  },

  closeWorkspace: () => {
    try {
      localStorage.removeItem(STORAGE_KEY_LAST_WORKSPACE);
    } catch {}
    document.title = 'NEXORA AI';
    useIdeStore.getState().closeAllTabs();
    useIdeStore.getState().setCurrentProjectId(null);
    set({
      currentWorkspace: null,
      activeBranch: null,
      fileTree: [],
      pendingConflict: null,
      isTrustDialogOpen: false,
    });
  },

  fetchRecentWorkspaces: async () => {
    const { accessToken } = useAuthStore.getState();
    const token = accessToken || 'dev';

    try {
      const res = await fetch('/api/workspace/recent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ recentWorkspaces: data.recents || [] });
      }
    } catch {}
  },

  setActiveBranch: (activeBranch) => set({ activeBranch }),

  fetchGitBranch: async () => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;

    const { accessToken } = useAuthStore.getState();
    const token = accessToken || 'dev';

    try {
      const res = await fetch(`/api/git/branch?root=${encodeURIComponent(currentWorkspace.rootPath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ activeBranch: data.isRepo ? data.branch : null });
      }
    } catch {}
  },

  fetchFileTree: async (subpath = '') => {
    const { currentWorkspace, fileTree } = get();
    if (!currentWorkspace) return;

    const { accessToken } = useAuthStore.getState();
    const token = accessToken || 'dev';

    try {
      const res = await fetch(
        `/api/fs/tree?root=${encodeURIComponent(currentWorkspace.rootPath)}&path=${encodeURIComponent(subpath)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return;
      const data = await res.json();
      const entries: WorkspaceFileNode[] = data.entries || [];

      if (!subpath) {
        // Root directory
        set({ fileTree: entries });
      } else {
        // Update nested directory children
        const updateChildren = (nodes: WorkspaceFileNode[]): WorkspaceFileNode[] => {
          return nodes.map((node) => {
            if (node.path === subpath) {
              return { ...node, children: entries, isExpanded: true, isLoading: false };
            }
            if (node.children) {
              return { ...node, children: updateChildren(node.children) };
            }
            return node;
          });
        };
        set({ fileTree: updateChildren(fileTree) });
      }
    } catch {}
  },

  toggleFolderExpand: async (folderPath: string) => {
    const { fileTree, fetchFileTree } = get();

    // Helper to toggle expand state
    let needsFetch = false;

    const toggle = (nodes: WorkspaceFileNode[]): WorkspaceFileNode[] => {
      return nodes.map((node) => {
        if (node.path === folderPath) {
          const newExpanded = !node.isExpanded;
          if (newExpanded && (!node.children || node.children.length === 0)) {
            needsFetch = true;
            return { ...node, isExpanded: true, isLoading: true };
          }
          return { ...node, isExpanded: newExpanded };
        }
        if (node.children) {
          return { ...node, children: toggle(node.children) };
        }
        return node;
      });
    };

    set({ fileTree: toggle(fileTree) });

    if (needsFetch) {
      await fetchFileTree(folderPath);
    }
  },

  setOpenFolderModalOpen: (isOpenFolderModalOpen: boolean) => set({ isOpenFolderModalOpen }),
  setTrustDialogOpen: (isTrustDialogOpen: boolean) => set({ isTrustDialogOpen }),
  setPendingConflict: (pendingConflict) => set({ pendingConflict }),

  initWebSocket: () => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//127.0.0.1:4000/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        set({ wsConnected: true });
        ws.send(JSON.stringify({ type: 'subscribe_workspace', root: currentWorkspace.rootPath }));
      };

      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'file_change') {
            const { changeType, path: relPath } = msg;

            // Re-fetch parent directory tree
            const parentDir = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '';
            get().fetchFileTree(parentDir);

            // If the changed file is open in editor
            const ideState = useIdeStore.getState();
            const openTab = ideState.openTabs.find((t) => t.path === relPath);

            if (openTab && changeType === 'change') {
              const { accessToken } = useAuthStore.getState();
              const token = accessToken || 'dev';
              const readRes = await fetch(
                `/api/fs/read?root=${encodeURIComponent(currentWorkspace.rootPath)}&path=${encodeURIComponent(relPath)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (readRes.ok) {
                const readData = await readRes.json();
                if (readData.content !== undefined) {
                  if (openTab.isDirty) {
                    // Conflict! User edited file locally, but it changed externally on disk
                    set({
                      pendingConflict: {
                        path: relPath,
                        diskContent: readData.content,
                      },
                    });
                  } else {
                    // Silently reload clean tab with latest content from disk
                    ideState.updateTabContent(relPath, readData.content);
                    ideState.markSaved(relPath);
                  }
                }
              }
            } else if (openTab && changeType === 'delete') {
              ideState.closeTab(relPath);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        set({ wsConnected: false });
      };
    } catch {}
  },
}));
