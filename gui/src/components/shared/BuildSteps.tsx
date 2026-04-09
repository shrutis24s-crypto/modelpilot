import { Check, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

interface Step {
  label: string;
  status: StepStatus;
}

export function BuildSteps({ steps, elapsed }: { steps: Step[]; elapsed?: number }) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-body font-medium text-muted-foreground">Build Steps</span>
        {elapsed !== undefined && (
          <span className="font-mono text-xs text-primary tabular-nums">{elapsed.toFixed(1)}s</span>
        )}
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {step.status === 'completed' && (
                <Check size={14} className="text-success" />
              )}
              {step.status === 'active' && (
                <Loader2 size={14} className="text-primary animate-spin" />
              )}
              {step.status === 'failed' && (
                <span className="w-2 h-2 rounded-full bg-destructive" />
              )}
              {step.status === 'pending' && (
                <span className="w-2 h-2 rounded-full bg-text-ghost" />
              )}
            </div>
            <span className={`text-sm font-body ${
              step.status === 'active' ? 'text-foreground' :
              step.status === 'completed' ? 'text-muted-foreground' :
              step.status === 'failed' ? 'text-destructive' :
              'text-text-ghost'
            }`}>
              {i + 1}. {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
