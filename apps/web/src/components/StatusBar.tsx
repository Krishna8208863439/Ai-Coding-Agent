import React from 'react';
import {
  GitBranch,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Database,
  Radio,
  FileCode,
} from 'lucide-react';

interface StatusBarProps {
  branchName?: string;
  activeLanguage?: string;
  currentProjectId?: string;
  isSaving?: boolean;
}

export function StatusBar({
  branchName = 'main',
  activeLanguage = 'TypeScript',
  currentProjectId,
  isSaving = false,
}: StatusBarProps) {
  return (
    <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] select-none z-50">
      {/* Left Items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <GitBranch className="w-3 h-3" />
          <span>{branchName}</span>
        </div>

        <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <RefreshCw className="w-3 h-3" />
          <span>0↓ 0↑</span>
        </div>

        <div className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <CheckCircle2 className="w-3 h-3" />
          <span>0 Errors</span>
        </div>

        {isSaving && (
          <span className="text-white/80 animate-pulse text-[10px]">Saving workspace...</span>
        )}
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
          <span className="text-[10px]">NEXORA Core Connected</span>
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
