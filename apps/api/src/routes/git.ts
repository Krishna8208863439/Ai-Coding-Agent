import express, { Router, Response } from 'express';
import { simpleGit, SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { assertWithinRoot } from '../lib/workspaceSecurity';

export const gitRouter: Router = express.Router();

// Helper to safely get simpleGit instance
function getGit(root: string): SimpleGit | null {
  try {
    const resolved = fs.realpathSync(path.resolve(root));
    const gitDir = path.join(resolved, '.git');
    if (!fs.existsSync(gitDir)) {
      return null;
    }
    return simpleGit(resolved);
  } catch {
    return null;
  }
}

// GET /api/git/branch — Get current git branch
gitRouter.get('/branch', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);

    if (!git) {
      res.status(200).json({ isRepo: false, branch: null });
      return;
    }

    const branchSummary = await git.branchLocal();
    res.status(200).json({
      isRepo: true,
      branch: branchSummary.current || 'HEAD',
      allBranches: branchSummary.all,
    });
  } catch (err: any) {
    res.status(200).json({ isRepo: false, branch: null, error: err.message });
  }
});

// GET /api/git/status — Get full git status (changed, staged, untracked)
gitRouter.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);

    if (!git) {
      res.status(200).json({ isRepo: false, files: [] });
      return;
    }

    const status = await git.status();
    res.status(200).json({
      isRepo: true,
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      files: status.files.map((f) => ({
        path: f.path,
        index: f.index,
        working_dir: f.working_dir,
      })),
      modified: status.modified,
      staged: status.staged,
      not_added: status.not_added,
      deleted: status.deleted,
    });
  } catch (err: any) {
    res.status(200).json({ isRepo: false, files: [], error: err.message });
  }
});
