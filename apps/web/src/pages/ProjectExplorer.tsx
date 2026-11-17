import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree,
  FileCode,
  Folder,
  CheckCircle,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Code2,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useIdeStore } from '../store/ideStore';

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  template: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function ProjectExplorer() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const { setCurrentProjectId } = useIdeStore();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [accessToken]);

  const handleOpenProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    navigate('/');
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"? This removes all project files.`)) {
      return;
    }
    setDeletingId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.template.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] text-neutral-200 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-[#252525] bg-[#1a1a1a] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950/60 border border-blue-800/40 rounded-lg text-cyan-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              Project Management & Workspaces
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-950 text-cyan-400 border border-blue-800/50">
                PostgreSQL Managed
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400">
              Select, manage, and open your generated autonomous projects in the IDE.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/new-project')}
            className="px-3.5 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + New Project
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search workspaces by name or stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={fetchProjects}
            title="Refresh projects"
            className="p-1.5 bg-[#1e1e1e] border border-[#2e2e2e] hover:bg-[#282828] text-neutral-400 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Project Card Grid */}
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#2b2b2b] rounded-lg">
            <Folder className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-neutral-300 mb-1">No Workspaces Found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
              Generate a full-stack React, Python Flask, or Node.js application with autonomous agents to begin coding.
            </p>
            <button
              onClick={() => navigate('/new-project')}
              className="px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium"
            >
              + Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="bg-[#1c1c1c] border border-[#2c2c2c] hover:border-[#383838] rounded-lg p-4 flex flex-col justify-between transition-colors group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold text-neutral-100 block">
                      {p.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#272727] text-cyan-400 font-mono border border-[#333]">
                      {p.template}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                      {p.description}
                    </p>
                  )}

                  <div className="space-y-1 text-[11px] text-neutral-500 font-mono mb-4">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-medium">{p.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Updated:</span>
                      <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#252525] flex items-center justify-between">
                  <button
                    onClick={() => handleOpenProject(p.id)}
                    className="px-3 py-1.5 text-xs bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 rounded font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Open in IDE
                  </button>

                  <button
                    onClick={() => handleDeleteProject(p.id, p.name)}
                    disabled={deletingId === p.id}
                    title="Delete project"
                    className="p-1 hover:bg-red-950/50 hover:text-red-400 text-neutral-500 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
