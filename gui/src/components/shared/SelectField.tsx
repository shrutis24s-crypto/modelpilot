import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ value, onChange, options, placeholder }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-9 rounded-md border border-border bg-background px-3 text-left text-sm font-body text-foreground hover:border-border-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors flex items-center justify-between gap-2"
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel ?? placeholder ?? 'Select…'}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface shadow-lg shadow-black/20 overflow-hidden animate-scale-fade-in" style={{ animationDuration: '150ms' }}>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {placeholder && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-body text-muted-foreground hover:bg-surface-2 transition-colors"
              >
                {placeholder}
              </button>
            )}
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm font-body transition-colors ${
                  opt.value === value
                    ? 'text-primary bg-primary/5'
                    : 'text-foreground hover:bg-surface-2'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
