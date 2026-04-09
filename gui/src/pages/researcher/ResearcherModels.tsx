import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getModels } from '@/api/client';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Play, CheckCircle2, FolderPlus } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

function ResearcherAddModelCard() {
  return (
    <div className="rounded-lg border-l-4 bg-card p-8" style={{ borderLeftColor: '#0EA5E9' }}>
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
          <FolderPlus size={22} style={{ color: '#0EA5E9' }} />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">Need to add a model?</h3>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            To add a new model, ask your technical team to place the model folder
            in the correct location on this computer. Once added, it will appear
            here automatically when you refresh the page.
          </p>
        </div>
      </div>

      {/* Friendly file tree */}
      <div className="rounded-lg border border-border bg-surface-2/50 p-5 mb-4">
        <pre className="font-mono text-sm text-foreground leading-loose">
{`📁 models/
  └── 📁 your-model-name/
        ├── 📄 entry.py
        ├── 📄 requirements.txt
        └── 📄 Dockerfile (optional)`}
        </pre>
      </div>

      <p className="text-xs font-body text-muted-foreground">
        If you are setting this up yourself, contact your system administrator
        or refer to the ModelPilot documentation.
      </p>
    </div>
  );
}

export default function ResearcherModels() {
  const navigate = useNavigate();
  const { data: models, loading } = useApi<any[]>(getModels);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-2">My Models</h1>
      <p className="text-sm font-body text-muted-foreground mb-6">Select a model to run your analysis.</p>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (models ?? []).length === 0 ? (
        <ResearcherAddModelCard />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 stagger-fade-up">
            {(models ?? []).map((m: any) => {
              const name = typeof m === 'string' ? m : m.name ?? String(m);
              return (
                <div
                  key={name}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FlaskConical size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">{name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 size={12} className="text-success" />
                        <span className="text-[11px] font-body text-success">Ready to run</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/run?model=${encodeURIComponent(name)}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all shadow-sm"
                  >
                    <Play size={14} /> Run This Model
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-8">
            <ResearcherAddModelCard />
          </div>
        </>
      )}
      <CrossModeHint
        devHint="View model file paths, separate Build & Run actions per model"
        researcherHint="Try the simplified model cards with one-click Run"
      />
    </AppLayout>
  );
}