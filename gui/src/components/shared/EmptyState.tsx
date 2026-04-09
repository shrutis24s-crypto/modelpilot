import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  headline: string;
  cta?: string;
  onCtaClick?: () => void;
}

export function EmptyState({ icon: Icon, headline, cta, onCtaClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <Icon size={48} className="text-muted-foreground/50 mb-4" />
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{headline}</h3>
      {cta && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-4 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:opacity-90 transition-opacity"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
