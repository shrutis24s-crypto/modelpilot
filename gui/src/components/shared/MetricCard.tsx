interface MetricCardProps {
  label: string;
  value: number;
  max?: number;
  highlight?: boolean;
}

export function MetricCard({ label, value, max = 1, highlight }: MetricCardProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div
      className={`rounded-md border p-5 bg-surface transition-colors ${
        highlight ? 'border-primary/40' : 'border-border'
      }`}
      style={highlight ? { boxShadow: '0 0 20px rgba(57,208,255,0.15)' } : undefined}
    >
      <span className="text-xs font-body font-medium text-muted-foreground block mb-2">
        {label}
      </span>
      <div className="font-display text-2xl font-bold text-foreground mb-3">
        {(value * 100).toFixed(1)}%
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary animate-fill-bar"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
