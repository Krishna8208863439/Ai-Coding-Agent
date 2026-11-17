import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { usePreferencesStore, ToastNotification } from '../store/preferencesStore';

export function ToastContainer() {
  const { toasts, removeToast } = usePreferencesStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-2.5 transition-all animate-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-[#121c16]/95 border-emerald-800/80 text-emerald-200'
                : isError
                ? 'bg-[#211214]/95 border-red-800/80 text-red-200'
                : isWarning
                ? 'bg-[#211b11]/95 border-amber-800/80 text-amber-200'
                : 'bg-[#181a20]/95 border-cyan-800/80 text-cyan-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs leading-tight text-white flex items-center justify-between">
                <span>{t.title}</span>
                <span className="text-[9px] font-mono text-neutral-400 font-normal">{t.timestamp}</span>
              </div>
              {t.description && (
                <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed break-words">
                  {t.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
