import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { ComingSoon } from './pages/ComingSoon';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/new-project"
          element={
            <ComingSoon
              title="Prompt-to-Project Generation"
              phase={5}
              description="Natural language project requirement parser, architecture generator, and template builder."
              plannedFeatures={[
                'Multi-stack project scaffolder',
                'Requirements clarification prompt flow',
                'Automated file creation',
                'Database schema generation',
              ]}
            />
          }
        />
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
        <Route
          path="/api-manager"
          element={
            <ComingSoon
              title="Multi-Provider API Management Center"
              phase={3}
              description="Manage OpenAI, Anthropic, Gemini, Groq, Ollama, and custom endpoints with AES-256 encryption."
              plannedFeatures={[
                'AES-256-GCM encrypted credential vault',
                'Connection health testing',
                'Live model endpoint discovery',
                'Rate limit & token parameter controls',
              ]}
            />
          }
        />
        <Route
          path="/models"
          element={
            <ComingSoon
              title="AI Model Library"
              phase={3}
              description="Explore discovered models, compare context limits, tool capabilities, and select defaults."
              plannedFeatures={[
                'Live discovered model catalog',
                'Context window & capability filters',
                'Default model assignment',
                'Dynamic model switcher',
              ]}
            />
          }
        />
        <Route
          path="/explorer"
          element={
            <ComingSoon
              title="Project Explorer"
              phase={5}
              description="Browse and manage project directories, files, and generated solution trees."
              plannedFeatures={[
                'File tree navigation',
                'File creation and rename',
                'Git status badges',
                'Per-project workspace isolation',
              ]}
            />
          }
        />
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
