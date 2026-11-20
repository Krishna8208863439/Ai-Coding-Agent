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

// POST /api/git/stage — Stage files
gitRouter.post('/stage', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, paths = [] } = req.body;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    if (paths.length === 0) {
      await git.add('.');
    } else {
      await git.add(paths);
    }

    res.status(200).json({ success: true, staged: paths.length === 0 ? ['all'] : paths });
  } catch (err: any) {
    res.status(500).json({ error: 'STAGE_FAILED', message: err.message });
  }
});

// POST /api/git/unstage — Unstage files
gitRouter.post('/unstage', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, paths = [] } = req.body;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    if (paths.length === 0) {
      await git.reset(['HEAD']);
    } else {
      await git.reset(['HEAD', '--', ...paths]);
    }

    res.status(200).json({ success: true, unstaged: paths.length === 0 ? ['all'] : paths });
  } catch (err: any) {
    res.status(500).json({ error: 'UNSTAGE_FAILED', message: err.message });
  }
});

// POST /api/git/discard — Discard working copy changes or delete untracked
gitRouter.post('/discard', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, path: filePath, isUntracked = false } = req.body;

  if (!root || !filePath) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'Root and path are required' });
    return;
  }

  try {
    const fullPath = assertWithinRoot(filePath, root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    if (isUntracked) {
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    } else {
      await git.checkout(['--', filePath]);
    }

    res.status(200).json({ success: true, path: filePath });
  } catch (err: any) {
    res.status(500).json({ error: 'DISCARD_FAILED', message: err.message });
  }
});

// POST /api/git/commit — Commit staged changes
gitRouter.post('/commit', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, message } = req.body;

  if (!root || !message || !message.trim()) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'Root and commit message are required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    const result = await git.commit(message.trim());
    res.status(200).json({
      success: true,
      commit: result.commit,
      summary: result.summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'COMMIT_FAILED', message: err.message });
  }
});

// GET /api/git/diff — Get unified diff and file contents for Monaco DiffEditor
gitRouter.get('/diff', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;
  const filePath = req.query.path as string;
  const staged = req.query.staged === 'true';

  if (!root || !filePath) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'Root and path are required' });
    return;
  }

  try {
    const resolvedPath = assertWithinRoot(filePath, root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    // Get original content from HEAD
    let original = '';
    try {
      original = await git.show([`HEAD:${filePath}`]);
    } catch {
      // File is new / untracked, original is empty
      original = '';
    }

    // Get modified content (from working tree or index)
    let modified = '';
    if (staged) {
      try {
        modified = await git.show([`:0:${filePath}`]);
      } catch {
        modified = fs.existsSync(resolvedPath) ? fs.readFileSync(resolvedPath, 'utf8') : '';
      }
    } else {
      if (fs.existsSync(resolvedPath)) {
        modified = fs.readFileSync(resolvedPath, 'utf8');
      }
    }

    // Get diff text
    let diffText = '';
    try {
      if (staged) {
        diffText = await git.diff(['--cached', '--', filePath]);
      } else {
        diffText = await git.diff(['--', filePath]);
      }
    } catch {
      diffText = '';
    }

    res.status(200).json({
      path: filePath,
      original,
      modified,
      diffText,
      staged,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'DIFF_FAILED', message: err.message });
  }
});

// GET /api/git/remotes — List configured git remotes
gitRouter.get('/remotes', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const root = req.query.root as string;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(200).json({ remotes: [] });
      return;
    }

    const remotes = await git.getRemotes(true);
    res.status(200).json({ remotes });
  } catch (err: any) {
    res.status(200).json({ remotes: [], error: err.message });
  }
});

// POST /api/git/push — Push to remote
gitRouter.post('/push', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root } = req.body;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    const remotes = await git.getRemotes();
    if (remotes.length === 0) {
      res.status(400).json({ error: 'NO_REMOTE', message: 'No git remote repository configured for push.' });
      return;
    }

    await git.push();
    res.status(200).json({ success: true, message: 'Changes pushed to remote successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'PUSH_FAILED', message: err.message });
  }
});

// POST /api/git/pull — Pull from remote
gitRouter.post('/pull', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root } = req.body;

  if (!root) {
    res.status(400).json({ error: 'ROOT_REQUIRED', message: 'Root is required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    const remotes = await git.getRemotes();
    if (remotes.length === 0) {
      res.status(400).json({ error: 'NO_REMOTE', message: 'No git remote repository configured for pull.' });
      return;
    }

    const pullResult = await git.pull();
    res.status(200).json({ success: true, summary: pullResult.summary });
  } catch (err: any) {
    res.status(500).json({ error: 'PULL_FAILED', message: err.message });
  }
});

// POST /api/git/branch/checkout — Switch branch or create new branch
gitRouter.post('/branch/checkout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { root, branch, create = false } = req.body;

  if (!root || !branch) {
    res.status(400).json({ error: 'PARAMS_REQUIRED', message: 'Root and branch name are required' });
    return;
  }

  try {
    assertWithinRoot('', root);
    const git = getGit(root);
    if (!git) {
      res.status(400).json({ error: 'NOT_A_REPO', message: 'Not a git repository' });
      return;
    }

    if (create) {
      await git.checkoutLocalBranch(branch);
    } else {
      await git.checkout(branch);
    }

    res.status(200).json({ success: true, branch });
  } catch (err: any) {
    res.status(500).json({ error: 'CHECKOUT_FAILED', message: err.message });
  }
});
