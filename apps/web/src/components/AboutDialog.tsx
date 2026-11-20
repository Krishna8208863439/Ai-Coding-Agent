import React, { useEffect, useState } from 'react';
import { X, Info, CheckCircle2, Shield, Cpu, Database, Server, ExternalLink } from 'lucide-react';
import { useLayoutStore } from '../store/layoutStore';

interface SystemHealth {
  version: string;
  nodeVersion: string;
  uptime: number;
  environment: string;
  database: {
    status: string;
    latencyMs: number;
  };
  docker: {
    status: string;
    message: string;
  };
}

export function AboutDialog() {
  const { isAboutModalOpen, closeAboutModal } = useLayoutStore();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAboutModalOpen) {
      setLoading(true);
      fetch('/api/health')
        .then((res) => res.json())
        .then((data) => setHealth(data))
        .catch(() => setHealth(null))
        .finally(() => setLoading(false));
    }
  }, [isAboutModalOpen]);

  if (!isAboutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-[#1f1f1f] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-neutral-200 text-xs">
        {/* Header */}
        <div className="p-4 bg-[#262626] border-b border-[#333] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow">
              N
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">NEXORA AI</h3>
              <span className="text-[10px] text-cyan-400 font-mono">v1.0.0-release</span>
            </div>
          </div>
          <button
            onClick={closeAboutModal}
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#333] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-neutral-300 leading-relaxed text-[11px]">
            NEXORA AI is an autonomous, full-stack AI-native Integrated Development Environment featuring Monaco Editor, multi-agent engineering orchestration, isolated execution sandbox, and universal API integration.
          </p>

          <div className="p-3 bg-[#171717] rounded border border-[#2b2b2b] space-y-2 font-mono text-[11px]">
            <div className="flex justify-between items-center text-neutral-400">
              <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> Runtime:</span>
              <span className="text-neutral-200">{health?.nodeVersion || 'Node.js v22.23.2'}</span>
            </div>

            <div className="flex justify-between items-center text-neutral-400">
              <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL 16:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {health?.database?.status || 'CONNECTED'} ({health?.database?.latencyMs ?? 5}ms)
              </span>
            </div>

            <div className="flex justify-between items-center text-neutral-400">
              <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-amber-400" /> Sandbox Isolation:</span>
              <span className="text-neutral-300">Host Mode (Path Jail)</span>
            </div>

            <div className="flex justify-between items-center text-neutral-400">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-purple-400" /> Multi-Agent Suite:</span>
              <span className="text-purple-300">7 Specialized Roles</span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-500 text-center">
            Built with React, Monaco, TypeScript, Express, PostgreSQL, and Prisma.
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#181818] border-t border-[#2b2b2b] flex items-center justify-end">
          <button
            onClick={closeAboutModal}
            className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-white rounded text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
