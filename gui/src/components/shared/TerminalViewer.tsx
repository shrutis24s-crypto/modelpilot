import { Copy } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';
import { useEffect, useRef } from 'react';

interface TerminalViewerProps {
  lines: string[];
  autoScroll?: boolean;
}

function classifyLine(line: string) {
  if (/error/i.test(line)) return 'error';
  if (/warn(ing)?/i.test(line)) return 'warning';
  return 'normal';
}

function highlightTimestamp(line: string) {
  return line.replace(
    /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/,
    '<span class="text-primary">$1</span>'
  );
}

export function TerminalViewer({ lines, autoScroll = true }: TerminalViewerProps) {
  const { addToast } = useToastContext();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(lines.join('\n'));
    addToast('Logs copied', 'success');
  };

  return (
    <div className="relative rounded-md border border-border bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-[11px] font-mono text-muted-foreground">{lines.length} lines</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy size={12} />
        </button>
      </div>
      <div
        ref={containerRef}
        className="p-4 overflow-auto max-h-[500px] font-mono text-xs leading-[1.8]"
      >
        {lines.map((line, i) => {
          const type = classifyLine(line);
          return (
            <div
              key={i}
              className={`animate-line-fade ${
                type === 'error' ? 'bg-destructive/10 text-destructive' :
                type === 'warning' ? 'bg-warning/10 text-warning' :
                'text-foreground'
              } px-2 -mx-2 rounded-sm`}
              dangerouslySetInnerHTML={{ __html: highlightTimestamp(line) }}
            />
          );
        })}
      </div>
    </div>
  );
}
