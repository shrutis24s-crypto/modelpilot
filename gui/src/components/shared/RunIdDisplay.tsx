import { useToastContext } from '@/context/ToastContext';
import { Copy } from 'lucide-react';

export function RunIdDisplay({ runId }: { runId: string }) {
  const { addToast } = useToastContext();
  const truncated = runId.length > 12 ? runId.slice(0, 12) + '…' : runId;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(runId);
    addToast('Run ID copied to clipboard', 'success');
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors group"
      title="Click to copy full ID"
    >
      <span>{truncated}</span>
      <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
