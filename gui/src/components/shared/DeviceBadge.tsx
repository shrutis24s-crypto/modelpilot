const colorMap = {
  CPU: 'bg-muted text-muted-foreground',
  GPU: 'bg-purple-500/15 text-purple-400',
  'GPU-fallback': 'bg-amber-500/15 text-amber-400',
} as const;

export function DeviceBadge({ device }: { device: 'CPU' | 'GPU' | 'GPU-fallback' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${colorMap[device]}`}>
      {device}
    </span>
  );
}
