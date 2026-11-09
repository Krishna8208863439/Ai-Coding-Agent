import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { ComingSoon } from './pages/ComingSoon';
import { Settings } from './pages/Settings';
import { ApiManager } from './pages/ApiManager';
import { ModelLibrary } from './pages/ModelLibrary';
import { AIChat } from './pages/AIChat';
import { NewProject } from './pages/NewProject';
import { ProjectExplorer } from './pages/ProjectExplorer';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-project" element={<NewProject />} />
        <Route
          path="/workspace"
          element={
            <ComingSoon
              title="Advanced AI IDE Workspace"
              phase={7}
              description="Monaco editor integration, multi-tab editing, syntax highlighting, diff viewer, and file tree."
              plannedFeatures={[
                'Monaco code editor with tabs',
                'Inline code suggestions & diffs',
                'Project file tree explorer',
                'Diagnostics & problems panel',
              ]}
            />
          }
        />
        <Route
          path="/agents"
          element={
            <ComingSoon
              title="Autonomous AI Agent System"
              phase={6}
              description="7 synchronized engineering roles (Architect, Developer, Debugger, Tester, UI/UX, Security, PM)."
              plannedFeatures={[
                'Autonomous multi-agent execution pipeline',
                'Interactive task board & timeline',
                'Human-in-the-loop action approvals',
                'WebSocket real-time streaming',
              ]}
            />
          }
        />
        <Route path="/api-manager" element={<ApiManager />} />
        <Route path="/models" element={<ModelLibrary />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/explorer" element={<ProjectExplorer />} />
        <Route
          path="/terminal"
          element={
            <ComingSoon
              title="Integrated PTY Terminal & Sandbox"
              phase={8}
              description="Isolated Docker-based container execution with PTY streaming and strict resource limits."
              plannedFeatures={[
                'xterm.js terminal integration',
                'Docker container execution (Node, Python, Java)',
                'Sandboxed command execution',
                'Live application preview proxy',
              ]}
            />
          }
        />
        <Route
          path="/github"
          element={
            <ComingSoon
              title="Git & GitHub Integration"
              phase={10}
              description="OAuth account connection, repository creation, branch management, push/pull controls."
              plannedFeatures={[
                'GitHub OAuth integration',
                'Remote repository push/pull with approval',
                'Commit history viewer',
                'Branch switching & diff analysis',
              ]}
            />
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
