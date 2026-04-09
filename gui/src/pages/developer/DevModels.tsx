import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getModels } from '@/api/client';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useNavigate } from 'react-router-dom';
import { Box, Hammer, Play, Plus, X, FileCode2, FileText, Container } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

function HowToAddModel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-md border border-border bg-surface-2 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left group"
      >
        <span className="font-display text-sm font-semibold text-foreground">How to Add a Model</span>
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? <X size={16} /> : <Plus size={16} />}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-6 animate-fade-up" style={{ animationDuration: '0.25s' }}>
          <p className="text-sm font-body text-muted-foreground mb-4">
            Place your model folder inside the <code className="font-mono text-xs text-primary">models/</code> directory of your ModelPilot installation.
          </p>

          {/* File tree */}
          <pre className="font-mono text-xs text-foreground leading-relaxed mb-5 pl-1">
{`models/
└── your-model-name/
    ├── entry.py          ← required always
    ├── requirements.txt  ← required if no Dockerfile
    └── Dockerfile        ← optional, use instead of requirements.txt`}
          </pre>

          {/* Rule cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: FileCode2, title: 'entry.py', desc: 'Always required. This is your model entry point.' },
              { icon: FileText, title: 'requirements.txt', desc: 'Required if no Dockerfile. List all Python dependencies.' },
              { icon: Container, title: 'Dockerfile', desc: 'Optional. Use if you need custom env setup.' },
            ].map((card) => (
              <div key={card.title} className="rounded-md border border-border bg-surface p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon size={14} className="text-primary flex-shrink-0" />
                  <span className="font-mono text-xs font-semibold text-foreground">{card.title}</span>
                </div>
                <p className="text-[12px] font-body text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-[12px] font-body text-muted-foreground">
            After adding your model folder, refresh this page and it will appear automatically.
          </p>
        </div>
      )}
    </div>
  );
}

export default function DevModels() {
  const navigate = useNavigate();
  const { data: models, loading, error, refetch } = useApi<any[]>(getModels);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-6">Models</h1>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-40" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (models ?? []).length === 0 ? (
        <EmptyState icon={Box} headline="No models loaded yet" />
      ) : (
        <div className="grid grid-cols-3 gap-3 stagger-fade-up">
          {(models ?? []).map((m: any) => {
            const name = typeof m === 'string' ? m : m.name ?? m;
            const path = typeof m === 'object' ? m.path : undefined;

            return (
              <div
                key={name}
                className="rounded-md border border-border bg-surface p-5 hover:border-primary hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <Box size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-foreground truncate">{name}</h3>
                    {path && (
                      <p className="font-mono text-[11px] text-muted-foreground truncate mt-1">{path}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/build?model=${encodeURIComponent(name)}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border-bright transition-colors"
                  >
                    <Hammer size={12} /> Build
                  </button>
                  <button
                    onClick={() => navigate(`/run?model=${encodeURIComponent(name)}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Play size={12} /> Run
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HowToAddModel />

      <CrossModeHint
        devHint="View model paths, build & run actions per model"
        researcherHint="Try the simplified model cards with one-click Run"
      />
    </AppLayout>
  );
}