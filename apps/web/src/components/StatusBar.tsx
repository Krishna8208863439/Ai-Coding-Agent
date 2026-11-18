import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Radio,
} from 'lucide-react';

interface StatusBarProps {
  branchName?: string;
  activeLanguage?: string;
  currentProjectId?: string;
  isSaving?: boolean;
}

interface SystemHealthData {
  status: string;
  nodeVersion: string;
  database: {
    status: string;
    latencyMs: number;
  };
}

export function StatusBar({
  branchName = 'main',
  activeLanguage = 'TypeScript',
  currentProjectId,
  isSaving = false,
}: StatusBarProps) {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (mounted) setHealth(data);
        } else {
          if (mounted) setHealth(null);
        }
      } catch {
        if (mounted) setHealth(null);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isConnected = health?.database?.status === 'CONNECTED';
  const nodeVersion = health?.nodeVersion || 'Node.js';

  return (
    <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] select-none z-50">
      {/* Left Items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer" title="Git Branch">
          <GitBranch className="w-3 h-3" />
          <span>{branchName}</span>
        </div>

        <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer" title="Synchronize">
          <RefreshCw className="w-3 h-3" />
          <span>0↓ 0↑</span>
        </div>

        <div className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer" title="Compiler & Diagnostic Problems">
          {errorCount === 0 ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-200" />
          ) : (
            <AlertCircle className="w-3 h-3 text-amber-200" />
          )}
          <span>{errorCount} Errors</span>
        </div>

        {isSaving && (
          <span className="text-white/80 animate-pulse text-[10px]">Saving workspace...</span>
        )}
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1"
          title={
            isConnected
              ? `Connected to NEXORA Core (DB Latency: ${health?.database?.latencyMs}ms)`
              : 'NEXORA Core Disconnected'
          }
        >
          <Radio
            className={`w-3 h-3 ${
              isConnected ? 'text-emerald-300 animate-pulse' : 'text-red-300'
            }`}
          />
          <span className="text-[10px]">
            {isConnected ? 'NEXORA Core Connected' : '[DISCONNECTED]'}
          </span>
        </div>

        <div className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer" title="Runtime version">
          <span>{nodeVersion}</span>
        </div>

        <div className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <span>UTF-8</span>
        </div>

        <div className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer font-medium">
          <span>{activeLanguage}</span>
        </div>
      </div>
    </footer>
  );
}
