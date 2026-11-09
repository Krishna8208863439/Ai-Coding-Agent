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
import { AIAgents } from './pages/AIAgents';
import { AIWorkspace } from './pages/AIWorkspace';
import { TerminalPage } from './pages/TerminalPage';
import { TestingDashboard } from './pages/TestingDashboard';
import { GitHubPage } from './pages/GitHubPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-project" element={<NewProject />} />
        <Route path="/workspace" element={<AIWorkspace />} />
        <Route path="/agents" element={<AIAgents />} />
        <Route path="/api-manager" element={<ApiManager />} />
        <Route path="/models" element={<ModelLibrary />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/explorer" element={<ProjectExplorer />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/testing" element={<TestingDashboard />} />
        <Route path="/github" element={<GitHubPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
