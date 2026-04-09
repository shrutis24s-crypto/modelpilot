import { useToastContext } from '@/context/ToastContext';
import { X } from 'lucide-react';

const typeStyles = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-primary/30 bg-primary/10 text-primary',
};

const progressColors = {
  success: 'bg-success',
  error: 'bg-destructive',
  info: 'bg-primary',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`animate-slide-in-right rounded-lg border px-4 py-3 text-sm font-body flex flex-col gap-2 shadow-lg backdrop-blur-sm overflow-hidden ${typeStyles[toast.type || 'info']}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
              <X size={14} />
            </button>
          </div>
          <div className="h-0.5 w-full rounded-full opacity-30 overflow-hidden -mb-1">
            <div className={`h-full toast-progress-bar ${progressColors[toast.type || 'info']}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
