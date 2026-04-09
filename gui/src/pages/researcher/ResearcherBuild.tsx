import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getModels, getTemplates, selectTemplate, clearTemplate, buildModel } from '@/api/client';
import { SelectField } from '@/components/shared/SelectField';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { useToastContext } from '@/context/ToastContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sparkles, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

export default function ResearcherBuild() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToastContext();

  const { data: models, loading: modelsLoading } = useApi<any[]>(getModels);
  const { data: templates, loading: templatesLoading } = useApi<any[]>(getTemplates);

  const [selectedModel, setSelectedModel] = useState(searchParams.get('model') ?? '');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [buildResult, setBuildResult] = useState<any>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    const m = searchParams.get('model');
    if (m) setSelectedModel(m);
  }, [searchParams]);

  const modelList = (models ?? []).map((m: any) => typeof m === 'string' ? m : m.name ?? String(m));
  const templateList = (templates ?? []).map((t: any) => typeof t === 'string' ? t : t.name ?? String(t));

  const handleBuild = async () => {
    if (!selectedModel) return;
    setBuilding(true);
    setBuildResult(null);
    setBuildError(null);
    setProgress(0);
    setProgressMsg('Setting up your model environment…');

    // Animate progress
    const steps = [
      { pct: 30, msg: 'Setting up your model environment…', delay: 800 },
      { pct: 60, msg: 'Configuring dependencies…', delay: 600 },
      { pct: 85, msg: 'Almost ready…', delay: 400 },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.delay));
      setProgress(step.pct);
      setProgressMsg(step.msg);
    }

    try {
      const tpl = selectedTemplate || undefined;
      if (tpl) await selectTemplate(tpl);
      const result = await buildModel(selectedModel, tpl, false);
      setProgress(100);
      setProgressMsg('Model is ready to run!');
      setBuildResult(result);
      addToast('Model prepared successfully', 'success');
    } catch (e: any) {
      setBuildError(e.message);
      setProgress(0);
      addToast('Preparation failed', 'error');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-2">Prepare Model</h1>
        <p className="text-sm font-body text-muted-foreground mb-8">Set up your model so it's ready to run.</p>

        {!building && !buildResult && !buildError && (
          <div className="space-y-6 animate-fade-up">
            {/* Step 1 */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-body font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Step 1 of 2</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-1">Choose Your Model</h2>
              <p className="text-sm font-body text-muted-foreground mb-4">Select the model you'd like to prepare.</p>
              {modelsLoading ? <SkeletonLoader className="h-10 w-full rounded-lg" /> : (
                <SelectField
                  value={selectedModel}
                  onChange={setSelectedModel}
                  options={modelList.map((n: string) => ({ value: n, label: n }))}
                  placeholder="Choose a model…"
                />
              )}
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-body font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Step 2 of 2</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-1">Choose a Template</h2>
              <p className="text-sm font-body text-muted-foreground mb-4">
                Templates help set up the right environment. If unsure, leave this blank.
              </p>
              {templatesLoading ? <SkeletonLoader className="h-20 w-full rounded-lg" /> : (
                <div className="grid grid-cols-3 gap-2">
                  {templateList.map((n: string) => (
                    <button
                      key={n}
                      onClick={() => setSelectedTemplate(selectedTemplate === n ? '' : n)}
                      className={`text-center px-3 py-3 rounded-lg border text-sm font-body transition-all duration-200 ${
                        selectedTemplate === n
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border bg-card text-foreground hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Button */}
            <button
              onClick={handleBuild}
              disabled={!selectedModel}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-base font-display font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              <Sparkles size={16} /> Prepare Model
            </button>
          </div>
        )}

        {/* Building state */}
        {building && (
          <div className="rounded-xl border border-border bg-card p-10 shadow-sm text-center animate-fade-up">
            <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
            <div className="w-full h-2 rounded-full bg-border mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-body text-foreground">{progressMsg}</p>
          </div>
        )}

        {/* Success */}
        {buildResult && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-8 text-center animate-fade-up shadow-sm">
            <CheckCircle2 size={40} className="text-success mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Model Ready</h2>
            <p className="text-sm font-body text-muted-foreground mb-6">
              Your model has been prepared successfully. You can now run your analysis.
            </p>
            <button
              onClick={() => navigate(`/run?model=${encodeURIComponent(buildResult.model ?? selectedModel)}`)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-display font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all shadow-sm"
            >
              <Play size={14} /> Run Analysis Now
            </button>
          </div>
        )}

        {/* Error */}
        {buildError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center animate-fade-up shadow-sm">
            <AlertCircle size={40} className="text-destructive mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Something Went Wrong</h2>
            <p className="text-sm font-body text-muted-foreground mb-6">
              We couldn't prepare this model. Please check your model folder contains the required files.
            </p>
            <button
              onClick={() => { setBuildError(null); setProgress(0); }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-body font-medium border border-border text-foreground hover:bg-surface-2 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        <CrossModeHint
          devHint="Access force rebuild, template selection, and detailed build step logs"
          researcherHint="Try the guided wizard — just pick a model and go"
        />
      </div>
    </AppLayout>
  );
}
