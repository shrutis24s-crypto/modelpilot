import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getModels, runModel, listRuns } from '@/api/client';
import { BuildSteps, StepStatus } from '@/components/shared/BuildSteps';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DeviceBadge } from '@/components/shared/DeviceBadge';
import { RunIdDisplay } from '@/components/shared/RunIdDisplay';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { SelectField } from '@/components/shared/SelectField';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { useToastContext } from '@/context/ToastContext';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

const RUN_STEP_LABELS = [
  'Start container',
  'Initialise CPU/GPU',
  'Execute entry.py',
  'Capture outputs & logs',
  'Save to /outputs',
];

export default function DevRun() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToastContext();
  const { triggerRefresh } = useRunsRefresh();

  const { data: models, loading: modelsLoading } = useApi<any[]>(getModels);

  const [selectedModel, setSelectedModel] = useState(searchParams.get('model') ?? '');
  const [inputPath, setInputPath] = useState('');
  const [timeout, setTimeout_] = useState(600);
  const [useGpu, setUseGpu] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(RUN_STEP_LABELS.map(() => 'pending'));
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const m = searchParams.get('model');
    if (m) setSelectedModel(m);
  }, [searchParams]);

  const modelList = (models ?? []).map((m: any) => typeof m === 'string' ? m : m.name ?? String(m));

  const handleRun = async () => {
    if (!selectedModel) return;
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    setElapsed(0);
    setStepStatuses(RUN_STEP_LABELS.map(() => 'pending'));

    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);

    for (let i = 0; i < RUN_STEP_LABELS.length - 1; i++) {
      setStepStatuses(prev => prev.map((s, j) => j === i ? 'active' : j < i ? 'completed' : s));
      await new Promise(r => setTimeout(r, 500));
    }
    setStepStatuses(prev => prev.map((s, i) => i < prev.length - 1 ? 'completed' : 'active'));

    try {
      const result = await runModel(selectedModel, useGpu, timeout, inputPath || undefined);
      setStepStatuses(RUN_STEP_LABELS.map(() => 'completed'));
      setRunResult(result);
      triggerRefresh();
      addToast('Run completed', 'success');
    } catch (e: any) {
      setStepStatuses(prev => prev.map(s => s === 'active' ? 'failed' : s));
      setRunError(e.message);
      addToast('Run failed', 'error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunning(false);
    }
  };

  // Poll for run status updates while running
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(async () => {
      try {
        const runs = await listRuns();
        const latest = runs[0];
        if (['completed', 'failed', 'incomplete'].includes(latest?.status)) {
          clearInterval(interval);
          triggerRefresh();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [running, triggerRefresh]);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-6">Run Model</h1>

      <div className="grid grid-cols-2 gap-5">
        {/* Left — Configuration */}
        <div className="rounded-md border border-border bg-surface p-6 space-y-5">
          {/* Model */}
          <div>
            <label className="text-xs font-body font-medium text-muted-foreground block mb-1.5">Model</label>
            {modelsLoading ? <SkeletonLoader className="h-9 w-full" /> : (
              <SelectField
                value={selectedModel}
                onChange={setSelectedModel}
                options={modelList.map((n: string) => ({ value: n, label: n }))}
                placeholder="Select model…"
              />
            )}
          </div>

          {/* Input Path */}
          <div>
            <label className="text-xs font-body font-medium text-muted-foreground block mb-1.5">Input Path</label>
            <input
              type="text"
              value={inputPath}
              onChange={e => setInputPath(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-mono text-foreground hover:border-border-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="/data/inputs"
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="text-xs font-body font-medium text-muted-foreground block mb-1.5">Timeout (seconds)</label>
            <input
              type="number"
              value={timeout}
              onChange={e => setTimeout_(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-mono text-foreground hover:border-border-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          {/* GPU toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <label className="text-xs font-body font-medium text-foreground block">GPU Acceleration</label>
              <span className="text-[11px] text-muted-foreground">Use GPU if available</span>
            </div>
            <ToggleSwitch checked={useGpu} onChange={setUseGpu} accentColor="hsl(267 90% 71%)" />
          </div>

          {/* Execute button */}
          <button
            onClick={handleRun}
            disabled={!selectedModel || running}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-md text-sm font-display font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(57,208,255,0.15)]"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? 'Executing…' : 'Execute Model'}
          </button>
        </div>

        {/* Right — Execution steps */}
        <div className="space-y-4">
          <BuildSteps
            steps={RUN_STEP_LABELS.map((label, i) => ({ label, status: stepStatuses[i] }))}
            elapsed={running || runResult || runError ? elapsed : undefined}
          />

          {runResult && (
            <div className="rounded-md border border-success/30 bg-success/5 p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-display text-sm font-semibold text-success">Run Complete</span>
              </div>
              <div className="space-y-2.5 text-sm">
                {runResult.run_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-body text-xs">Run ID</span>
                    <RunIdDisplay runId={runResult.run_id} />
                  </div>
                )}
                {[
                  ['Model', runResult.model],
                  ['Version', runResult.version ?? runResult.image_tag],
                  ['Duration', runResult.duration_seconds ? (runResult.duration_seconds >= 60 ? `${Math.floor(runResult.duration_seconds / 60)}m ${Math.floor(runResult.duration_seconds % 60)}s` : `${Math.floor(runResult.duration_seconds)}s`) : undefined],
                  ['Input', runResult.input_path],
                ].filter(([, v]) => v !== undefined).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground font-body text-xs">{k}</span>
                    <span className="font-mono text-xs text-foreground">{String(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-body text-xs">Status</span>
                  <StatusBadge status={runResult.status ?? 'completed'} />
                </div>
                {runResult.device && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-body text-xs">Device</span>
                    <DeviceBadge device={runResult.device} />
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/results/${runResult.run_id}`)}
                className="mt-4 w-full flex items-center justify-center gap-2 h-9 rounded-md text-sm font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                View Full Results <ArrowRight size={13} />
              </button>
            </div>
          )}

          {runError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-destructive" />
                <span className="font-display text-sm font-semibold text-destructive">Run Failed</span>
              </div>
              <pre className="font-mono text-xs text-destructive leading-relaxed whitespace-pre-wrap">{runError}</pre>
              {/ModuleNotFoundError/i.test(runError) && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle size={13} className="text-warning mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-body text-warning">A Python module is missing. Check your requirements.txt and rebuild the container.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CrossModeHint
        devHint="Configure input path, timeout, GPU toggle, and see execution step logs"
        researcherHint="Try the simplified view with friendly progress messages"
      />
    </AppLayout>
  );
}
