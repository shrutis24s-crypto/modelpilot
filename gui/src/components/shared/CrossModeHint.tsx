import { useMode } from '@/context/ModeContext';
import { ArrowRight } from 'lucide-react';

interface CrossModeHintProps {
  devHint: string;
  researcherHint: string;
}

/**
 * Contextual banner that shows what the OTHER mode offers on this page.
 * Clicking it switches mode seamlessly — user stays on the same route.
 */
export function CrossModeHint({ devHint, researcherHint }: CrossModeHintProps) {
  const { mode, setMode } = useMode();
  const isDev = mode === 'developer';
  const hint = isDev ? researcherHint : devHint;
  const targetMode = isDev ? 'Researcher' : 'Developer';

  const handleSwitch = () => {
    setMode(isDev ? 'researcher' : 'developer');
  };

  return (
    <div className="mt-10 mx-auto max-w-2xl">
      <button
        onClick={handleSwitch}
        className="w-full group flex items-center justify-between gap-3 px-5 py-3.5 rounded-lg border border-border/60 bg-surface-2/30 hover:bg-surface-2/60 hover:border-border-bright transition-all duration-200"
      >
        <div className="flex items-center gap-3 text-left min-w-0">
          <span className="flex-shrink-0 text-[10px] font-mono font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
            {targetMode}
          </span>
          <span className="text-[13px] font-body text-muted-foreground group-hover:text-foreground transition-colors truncate">
            {hint}
          </span>
        </div>
        <ArrowRight size={14} className="flex-shrink-0 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </button>
    </div>
  );
}
