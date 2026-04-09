import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-8 text-center max-w-md mx-auto">
      <AlertTriangle size={32} className="text-destructive mx-auto mb-3" />
      <p className="text-sm text-destructive font-body mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-body font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      )}
    </div>
  );
}
