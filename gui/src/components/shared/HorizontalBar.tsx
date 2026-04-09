interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPct?: boolean;
}

export function HorizontalBar({ value, max = 1, label, showPct = true }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-destructive';

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm font-body text-muted-foreground w-32 shrink-0">{label}</span>}
      <div className="flex-1 h-2.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${color} animate-fill-bar`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPct && <span className="text-sm font-body font-medium text-foreground w-12 text-right">{Math.round(pct)}%</span>}
    </div>
  );
}
