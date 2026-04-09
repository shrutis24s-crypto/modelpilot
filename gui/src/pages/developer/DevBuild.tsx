import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getModels, getTemplates, getSelectedTemplate, selectTemplate, clearTemplate, buildModel } from '@/api/client';
import { BuildSteps, StepStatus } from '@/components/shared/BuildSteps';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { ErrorState } from '@/components/shared/ErrorState';
import { SelectField } from '@/components/shared/SelectField';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { useToastContext } from '@/context/ToastContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Hexagon, Play, X, Check, AlertTriangle } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

const BUILD_STEP_LABELS = [
  'Validate model folder',
  'Resolve Dockerfile source',
  'Build container image',
  'Tag & version image',
];

export default function DevBuild() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToastContext();

  const { data: models, loading: modelsLoading } = useApi<any[]>(getModels);
  const { data: templates, loading: templatesLoading } = useApi<any[]>(getTemplates);
  const { data: selectedTpl, refetch: refetchSelected } = useApi<any>(getSelectedTemplate);

  const [selectedModel, setSelectedModel] = useState(searchParams.get('model') ?? '');
  const [forceRebuild, setForceRebuild] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<any>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(BUILD_STEP_LABELS.map(() => 'pending'));
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const m = searchParams.get('model');
    if (m) setSelectedModel(m);
  }, [searchParams]);

  const modelList = (models ?? []).map((m: any) => typeof m === 'string' ? m : m.name ?? String(m));
  const templateList = (templates ?? []).map((t: any) => typeof t === 'string' ? t : t.name ?? String(t));

  const handleSelectTemplate = async (name: string) => {
    if (!name) return;
    if (name === currentTpl) return;
    try {
      await selectTemplate(name);
      setSelectedTemplateName(name);
      refetchSelected();
      addToast(`Template "${name}" selected`, 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleClearTemplate = async () => {
    try {
      await clearTemplate();
      setSelectedTemplateName('');
      refetchSelected();
      addToast('Template cleared', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleBuild = async () => {
    if (!selectedModel) return;
    setBuilding(true);
    setBuildResult(null);
    setBuildError(null);
    setElapsed(0);
    setStepStatuses(BUILD_STEP_LABELS.map(() => 'pending'));

    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);

    for (let i = 0; i < BUILD_STEP_LABELS.length; i++) {
      setStepStatuses(prev => prev.map((s, j) => j === i ? 'active' : j < i ? 'completed' : s));
      await new Promise(r => setTimeout(r, 300));
    }

    try {
      const tpl = selectedTemplateName || undefined;
      const result = await buildModel(selectedModel, tpl, forceRebuild);
      setStepStatuses(BUILD_STEP_LABELS.map(() => 'completed'));
      setBuildResult(result);
      addToast('Build completed', 'success');
    } catch (e: any) {
      setStepStatuses(prev => prev.map((s, i) => s === 'active' ? 'failed' : i === prev.length - 1 && s === 'pending' ? 'failed' : s));
      setBuildError(e.message);
      addToast('Build failed', 'error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setBuilding(false);
    }
  };

  const currentTpl = selectedTemplateName || (typeof selectedTpl === 'object' && selectedTpl?.name) || '';

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-6">Load & Build</h1>

      <div className="grid grid-cols-2 gap-5">
        {/* Left — Configuration */}
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface p-6 space-y-5">
            {/* Model */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground block mb-1.5">Model</label>
              {modelsLoading ? <SkeletonLoader className="h-9 w-full" /> : (
                <div className="relative z-[60]">
                  <SelectField
                    value={selectedModel}
                    onChange={setSelectedModel}
                    options={modelList.map((n: string) => ({ value: n, label: n }))}
                    placeholder="Select model…"
                  />
                </div>
              )}
            </div>

            {/* Force Rebuild */}
            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-xs font-body font-medium text-foreground block">Force Rebuild</label>
                <span className="text-[11px] text-muted-foreground">Ignore cached layers</span>
              </div>
              <ToggleSwitch checked={forceRebuild} onChange={setForceRebuild} />
            </div>

            {/* Template */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground block mb-1.5">Template</label>
              {templatesLoading ? <SkeletonLoader className="h-9 w-full" /> : (
                <SelectField
                  value={selectedTemplateName}
                  onChange={v => v ? handleSelectTemplate(v) : setSelectedTemplateName('')}
                  options={templateList.map((n: string) => ({ value: n, label: n }))}
                  placeholder="No template"
                />
              )}
              {currentTpl && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-xs text-primary">{currentTpl}</span>
                  <button onClick={handleClearTemplate} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Build button */}
            <button
              onClick={handleBuild}
              disabled={!selectedModel || building}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-md text-sm font-display font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(57,208,255,0.15)]"
            >
              <Hexagon size={14} />
              {building ? 'Building…' : 'Build Container'}
            </button>
          </div>

          {/* Quick Start Templates */}
          {!templatesLoading && (templates ?? []).length > 0 && (
            <div className="rounded-md border border-border bg-surface p-5">
              <span className="text-xs font-body font-medium text-muted-foreground block mb-3">Quick Start Templates</span>
              <div className="grid grid-cols-2 gap-2">
                {templateList.slice(0, 6).map((n: string) => (
                  <button
                    key={n}
                    onClick={() => handleSelectTemplate(n)}
                    className={`text-left px-3 py-2 rounded-md border text-xs font-body transition-colors ${
                      currentTpl === n
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border-bright text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Build Steps */}
        <div className="space-y-4">
          <BuildSteps
            steps={BUILD_STEP_LABELS.map((label, i) => ({ label, status: stepStatuses[i] }))}
            elapsed={building || buildResult || buildError ? elapsed : undefined}
          />

          {buildResult && (
            <div className="rounded-md border border-success/30 bg-success/5 p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <Check size={16} className="text-success" />
                <span className="font-display text-sm font-semibold text-success">Build Complete</span>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  ['Model', buildResult.model],
                  ['Version', buildResult.version ?? buildResult.image_tag],
                  ['Source', buildResult.source ?? buildResult.dockerfile_source],
                  ['Dockerfile', buildResult.dockerfile],
                  ['Cached', buildResult.cached ? 'Yes' : 'No'],
                ].filter(([, v]) => v !== undefined).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground font-body text-xs">{k}</span>
                    <span className="font-mono text-xs text-foreground">{String(v)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate(`/run?model=${encodeURIComponent(buildResult.model ?? selectedModel)}`)}
                className="mt-4 w-full flex items-center justify-center gap-2 h-9 rounded-md text-sm font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Play size={13} /> Run This Model
              </button>
            </div>
          )}

          {buildError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-destructive" />
                <span className="font-display text-sm font-semibold text-destructive">Build Failed</span>
              </div>
              <pre className="font-mono text-xs text-destructive leading-relaxed whitespace-pre-wrap">{buildError}</pre>
              {/requirements|ModuleNotFound|pip/i.test(buildError) && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle size={13} className="text-warning mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-body text-warning">Check your requirements.txt — a missing dependency may be causing this failure.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CrossModeHint
        devHint="Access force rebuild, template selection, and step-by-step build logs"
        researcherHint="Try the guided wizard — just pick a model and go"
      />
    </AppLayout>
  );
}
