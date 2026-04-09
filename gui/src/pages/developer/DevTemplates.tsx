import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getTemplates, getSelectedTemplate, selectTemplate, clearTemplate, getTemplate } from '@/api/client';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useToastContext } from '@/context/ToastContext';
import { useState } from 'react';
import { FileStack, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

export default function DevTemplates() {
  const { addToast } = useToastContext();
  const { data: templates, loading, error, refetch } = useApi<any[]>(getTemplates);
  const { data: selectedTpl, refetch: refetchSelected } = useApi<any>(getSelectedTemplate);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dockerfileContent, setDockerfileContent] = useState<Record<string, string>>({});

  const currentTpl = typeof selectedTpl === 'object' ? selectedTpl?.name : selectedTpl;

  const handleSelect = async (name: string) => {
    if (currentTpl === name) return;
    try {
      await selectTemplate(name);
      refetchSelected();
      addToast(`Template "${name}" selected`, 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleClear = async () => {
    try {
      await clearTemplate();
      refetchSelected();
      addToast('Template cleared', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleToggleDockerfile = async (name: string) => {
    if (expanded === name) {
      setExpanded(null);
      return;
    }
    setExpanded(name);
    if (!dockerfileContent[name]) {
      try {
        const detail = await getTemplate(name);
        setDockerfileContent(prev => ({
          ...prev,
          [name]: detail?.dockerfile ?? detail?.content ?? JSON.stringify(detail, null, 2),
        }));
      } catch {
        setDockerfileContent(prev => ({ ...prev, [name]: 'Failed to load' }));
      }
    }
  };

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-6">Templates</h1>

      {/* Active template banner */}
      {currentTpl && (
        <div className="flex items-center justify-between px-4 py-3 mb-6 rounded-md border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-primary" />
            <span className="text-sm font-body text-foreground">Active template:</span>
            <span className="font-mono text-sm text-primary">{currentTpl}</span>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-36" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (templates ?? []).length === 0 ? (
        <EmptyState icon={FileStack} headline="No templates available" />
      ) : (
        <div className="grid grid-cols-3 gap-3 stagger-fade-up">
          {(templates ?? []).map((t: any) => {
            const name = typeof t === 'string' ? t : t.name ?? String(t);
            const isExpanded = expanded === name;
            const isActive = currentTpl === name;

            return (
              <div
                key={name}
                className={`rounded-md border bg-surface transition-all duration-200 ${
                  isActive ? 'border-primary/40' : 'border-border hover:border-border-bright'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileStack size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                      <h3 className="font-display text-sm font-semibold text-foreground">{name}</h3>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary">Active</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleDockerfile(name)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-body font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border-bright transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      Dockerfile
                    </button>
                    <button
                      onClick={() => handleSelect(name)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-body font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-2 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isActive ? <Check size={11} /> : null}
                      {isActive ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-3">
                    <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed overflow-auto max-h-[200px] whitespace-pre-wrap">
                      {dockerfileContent[name] ?? 'Loading…'}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <CrossModeHint
        devHint="Inspect Dockerfiles and manage active templates"
        researcherHint="Try the simplified template picker with friendly descriptions"
      />
    </AppLayout>
  );
}
