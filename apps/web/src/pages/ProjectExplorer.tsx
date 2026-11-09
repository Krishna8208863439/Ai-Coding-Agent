import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { FolderTree, FileCode, Folder, CheckCircle, RefreshCw, Layers } from 'lucide-react';

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  template: string;
  status: string;
}

interface ProjectFileItem {
  path: string;
  isDir: boolean;
  size: number;
}

export function ProjectExplorer() {
  const { accessToken } = useAuthStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [files, setFiles] = useState<ProjectFileItem[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        if (data.projects?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.projects[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (projId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/projects/${projId}/files`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.files?.length > 0) {
          const firstFile = data.files.find((f: ProjectFileItem) => !f.isDir);
          if (firstFile) {
            loadFileContent(projId, firstFile.path);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const loadFileContent = async (projId: string, path: string) => {
    if (!accessToken) return;
    try {
      setSelectedFilePath(path);
      const res = await fetch(`/api/projects/${projId}/files/content?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [accessToken]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchFiles(selectedProjectId);
    }
  }, [selectedProjectId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-indigo-400" />
            Project File Explorer & Solution Tree
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Inspect generated source files, manifests, schemas, and README documents in isolated workspaces.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchProjects} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Workspaces</span>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1f2433] p-12 text-center text-xs text-neutral-400">
          <Layers className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
          <p>No projects generated yet.</p>
          <p className="text-neutral-500 mt-1">Use the "New Project" generator to build your first full-stack application.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Projects Column */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">Projects</h3>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedProjectId === p.id
                    ? 'border-indigo-500 bg-indigo-950/20 text-white'
                    : 'border-[#1f2433] bg-[#0d0f17] text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs truncate">{p.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{p.template}</Badge>
                </div>
                <p className="text-[11px] text-neutral-400 truncate mt-1">{p.description}</p>
              </button>
            ))}
          </div>

          {/* File Tree Column */}
          <div className="lg:col-span-1 rounded-xl border border-[#1f2433] bg-[#0d0f17] p-3 space-y-1">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Files</h3>
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => !f.isDir && selectedProjectId && loadFileContent(selectedProjectId, f.path)}
                className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-left transition-colors ${
                  selectedFilePath === f.path
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                }`}
              >
                {f.isDir ? (
                  <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <FileCode className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                )}
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>

          {/* File Preview Column */}
          <div className="lg:col-span-2 rounded-xl border border-[#1f2433] bg-[#0d0f17] flex flex-col overflow-hidden">
            <div className="border-b border-[#1f2433] px-4 py-2.5 flex items-center justify-between bg-[#131620]">
              <span className="font-mono text-xs text-neutral-300">{selectedFilePath || 'Select a file'}</span>
              <Badge variant="success">Workspace File</Badge>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-[#090a0f]">
              {fileContent ? (
                <pre className="font-mono text-xs text-neutral-200 leading-relaxed whitespace-pre">
                  <code>{fileContent}</code>
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                  Select a file from the tree to preview contents.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
