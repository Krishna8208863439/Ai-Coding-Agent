import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { logger } from '../app';

export interface FileChangeEvent {
  type: 'create' | 'change' | 'delete';
  path: string;
  isDir: boolean;
  root: string;
}

type FileChangeListener = (event: FileChangeEvent) => void;

class WorkspaceWatcherManager {
  private watchers = new Map<string, FSWatcher>();
  private listeners = new Set<FileChangeListener>();

  public addListener(listener: FileChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public watchRoot(rootPath: string): void {
    const normalizedRoot = path.resolve(rootPath);
    if (this.watchers.has(normalizedRoot)) {
      return; // already watching
    }

    logger.info(`Starting file watcher for workspace: ${normalizedRoot}`);

    const watcher = chokidar.watch(normalizedRoot, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/__pycache__/**',
        '**/.turbo/**',
        '**/.cache/**',
        '**/*.nexora_tmp',
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 50,
      },
    });

    const notify = (type: 'create' | 'change' | 'delete', filePath: string, isDir: boolean) => {
      const relPath = path.relative(normalizedRoot, filePath).replace(/\\/g, '/');
      const event: FileChangeEvent = {
        type,
        path: relPath,
        isDir,
        root: normalizedRoot,
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (err) {
          logger.error({ err }, 'Error in file change listener');
        }
      }
    };

    watcher
      .on('add', (filePath) => notify('create', filePath, false))
      .on('change', (filePath) => notify('change', filePath, false))
      .on('unlink', (filePath) => notify('delete', filePath, false))
      .on('addDir', (dirPath) => notify('create', dirPath, true))
      .on('unlinkDir', (dirPath) => notify('delete', dirPath, true))
      .on('error', (err) => logger.warn({ err, root: normalizedRoot }, 'Watcher error'));

    this.watchers.set(normalizedRoot, watcher);
  }

  public unwatchRoot(rootPath: string): void {
    const normalizedRoot = path.resolve(rootPath);
    const watcher = this.watchers.get(normalizedRoot);
    if (watcher) {
      watcher.close();
      this.watchers.delete(normalizedRoot);
      logger.info(`Stopped file watcher for: ${normalizedRoot}`);
    }
  }

  public stopAll(): void {
    for (const [root, watcher] of this.watchers.entries()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

export const workspaceWatcher = new WorkspaceWatcherManager();
