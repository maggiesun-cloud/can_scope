import React from 'react';
import { ToastMessage } from '../store/canStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          );

        const borderColor =
          toast.type === 'success'
            ? 'border-emerald-500/30'
            : toast.type === 'warning'
            ? 'border-amber-500/30'
            : toast.type === 'error'
            ? 'border-rose-500/30'
            : 'border-cyan-500/30';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-3 bg-zinc-900/95 border ${borderColor} rounded-lg shadow-xl backdrop-blur-md transition-all text-sm`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-zinc-100 text-xs tracking-wide">{toast.title}</div>
              {toast.message && <div className="text-zinc-400 text-xs mt-0.5 break-words">{toast.message}</div>}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
