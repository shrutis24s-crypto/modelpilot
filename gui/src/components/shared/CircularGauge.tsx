import { useCountUp } from '@/hooks/useCountUp';

interface CircularGaugeProps {
  value: number;
  max?: number;
  size?: number;
  label: string;
  sublabel?: string;
}

export function CircularGauge({ value, max = 1, size = 140, label, sublabel }: CircularGaugeProps) {
  const pct = Math.min(value / max, 1);
  const displayPct = useCountUp(Math.round(pct * 100), 800);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  const color = pct >= 0.8 ? 'hsl(var(--success))' : pct >= 0.6 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div
      className="flex flex-col items-center p-5 rounded-xl border border-border bg-card transition-all duration-250 hover:-translate-y-[3px]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <svg
        width={size}
        height={size}
        className="mb-3"
        style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 8px rgba(14,165,233,0.3))' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-[800ms]"
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <span className="font-display text-2xl font-bold text-foreground">{displayPct}%</span>
      <span className="text-xs font-body font-medium text-muted-foreground mt-1">{label}</span>
      {sublabel && (
        <span className="text-[11px] font-body text-muted-foreground/70 mt-0.5 text-center max-w-[160px]">{sublabel}</span>
      )}
    </div>
  );
}
