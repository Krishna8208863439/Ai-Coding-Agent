import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function TrustFolderDialog() {
  const {
    isTrustDialogOpen,
    currentWorkspace,
    trustCurrentWorkspace,
    setRestrictedMode,
  } = useWorkspaceStore();

  if (!isTrustDialogOpen || !currentWorkspace || currentWorkspace.trusted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-[#1f1f1f] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#262626] border-b border-[#333] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Do you trust the authors of the files in this folder?
            </h3>
            <p className="text-xs text-neutral-400 font-mono truncate max-w-md mt-0.5">
              {currentWorkspace.rootPath}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-neutral-300 space-y-3 leading-relaxed">
          <p>
            NEXORA AI provides autonomous multi-agent code generation, terminal execution, and direct workspace modifications.
          </p>

          <div className="p-3 bg-[#171717] rounded border border-[#2d2d2d] space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-200">Restricted Mode:</strong> If you do not trust the authors, you can browse and edit files, but terminal execution, background builds, and autonomous AI code modifications are disabled.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-200">Trusted Mode:</strong> Full IDE capabilities are enabled, including multi-agent orchestration, test runs, and integrated terminal commands.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-[#1a1a1a] border-t border-[#2d2d2d] flex items-center justify-end gap-2.5">
          <button
            onClick={() => setRestrictedMode(true)}
            className="px-3.5 py-1.5 bg-[#2b2b2b] hover:bg-[#383838] text-neutral-300 hover:text-white rounded text-xs transition-colors"
          >
            Open in Restricted Mode
          </button>

          <button
            onClick={trustCurrentWorkspace}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded text-xs shadow flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Yes, I Trust the Authors</span>
          </button>
        </div>
      </div>
    </div>
  );
}
