import { useMode } from '@/context/ModeContext';

type Status = 'running' | 'completed' | 'failed' | 'building';

const devColors: Record<Status, string> = {
  running: 'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
  building: 'bg-warning/15 text-warning',
};

const researcherColors: Record<Status, string> = {
  running: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  building: 'bg-warning/10 text-warning',
};

export function StatusBadge({ status }: { status: Status }) {
  const { mode } = useMode();
  const colors = mode === 'researcher' ? researcherColors : devColors;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${
        mode === 'researcher' ? 'font-body' : 'font-mono'
      } ${colors[status]}`}
    >
      {status}
    </span>
  );
}
