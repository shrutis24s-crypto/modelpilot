import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getTemplates, getSelectedTemplate, selectTemplate, clearTemplate } from '@/api/client';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { useToastContext } from '@/context/ToastContext';
import { Layers, CheckCircle2, X, FlaskConical, Cpu, BrainCircuit } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

const TEMPLATE_ICONS: Record<string, any> = {
  pytorch: BrainCircuit,
  tensorflow: Cpu,
  'scikit-learn': FlaskConical,
  sklearn: FlaskConical,
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  pytorch: 'For deep learning models built with PyTorch',
  tensorflow: 'For models built with TensorFlow or Keras',
  'scikit-learn': 'For classical machine learning models',
  sklearn: 'For classical machine learning models',
};

export default function ResearcherTemplates() {
  const { addToast } = useToastContext();
  const { data: templates, loading } = useApi<any[]>(getTemplates);
  const { data: selectedTpl, refetch: refetchSelected } = useApi<any>(getSelectedTemplate);

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

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-2">Model Templates</h1>
      <p className="text-sm font-body text-muted-foreground mb-8 max-w-lg">
        Templates help ModelPilot automatically set up the right environment for different types of machine learning models.
        Select the template that matches your model type.
      </p>

      {/* Active template banner */}
      {currentTpl && (
        <div className="flex items-center justify-between px-5 py-3 mb-6 rounded-xl border border-primary/30 bg-primary/5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-primary" />
            <span className="text-sm font-body text-foreground">Active template:</span>
            <span className="text-sm font-body font-semibold text-primary">{currentTpl}</span>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={12} /> Remove
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : (templates ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <Layers size={40} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-base font-body text-muted-foreground">No templates available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 stagger-fade-up">
          {(templates ?? []).map((t: any) => {
            const name = typeof t === 'string' ? t : t.name ?? String(t);
            const lowerName = name.toLowerCase();
            const isActive = currentTpl === name;
            const Icon = Object.entries(TEMPLATE_ICONS).find(([k]) => lowerName.includes(k))?.[1] ?? Layers;
            const desc = Object.entries(TEMPLATE_DESCRIPTIONS).find(([k]) => lowerName.includes(k))?.[1] ?? 'Machine learning model template';

            return (
              <div
                key={name}
                className={`rounded-xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{name}</h3>
                <p className="text-sm font-body text-muted-foreground mb-5">{desc}</p>
                <button
                  onClick={() => handleSelect(name)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-semibold transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-primary text-primary-foreground hover:brightness-105 shadow-sm'
                  }`}
                >
                  {isActive ? <><CheckCircle2 size={14} /> Selected</> : 'Use This Template'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <CrossModeHint
        devHint="Inspect Dockerfiles and manage active templates in detail"
        researcherHint="Try the simplified template picker with friendly descriptions"
      />
    </AppLayout>
  );
}
