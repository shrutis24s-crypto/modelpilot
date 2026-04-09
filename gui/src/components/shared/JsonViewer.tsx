import { Copy } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function JsonViewer({ data }: { data: any }) {
  const { addToast } = useToastContext();
  const formatted = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatted);
    addToast('Copied to clipboard', 'success');
  };

  return (
    <div className="relative rounded-md border border-border bg-background">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        <Copy size={14} />
      </button>
      <pre
        className="p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[600px]"
        dangerouslySetInnerHTML={{ __html: syntaxHighlight(formatted) }}
      />
    </div>
  );
}
