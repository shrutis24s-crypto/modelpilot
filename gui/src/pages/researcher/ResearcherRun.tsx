import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getModels, runModel, listRuns } from '@/api/client';
import { SelectField } from '@/components/shared/SelectField';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { useToastContext } from '@/context/ToastContext';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2, ArrowRight, Info } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';

const friendlyMessages = [
  'Starting analysis…',
  'Processing your data…',
  'Running model inference…',
  'Almost done…',
];

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function ResearcherRun() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToastContext();
  const { triggerRefresh } = useRunsRefresh();

  const { data: models, loading: modelsLoading } = useApi<any[]>(getModels);

  const [selectedModel, setSelectedModel] = useState(searchParams.get('model') ?? '');
  const [inputPath, setInputPath] = useState('');
  const [processingMode, setProcessingMode] = useState<'standard' | 'accelerated'>('standard');
  const [running, setRunning] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [runResult, setRunResult] = useState<any>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setMsgIndex(0);

    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 1000);
    msgRef.current = setInterval(() => {
      setMsgIndex(prev => Math.min(prev + 1, friendlyMessages.length - 1));
    }, 3000);

    try {
      const result = await runModel(selectedModel, processingMode === 'accelerated', 600, inputPath || undefined);
      setRunResult(result);
      triggerRefresh();
      addToast('Analysis complete', 'success');
    } catch (e: any) {
      setRunError(e.message);
      addToast('Analysis failed', 'error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
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
      <div className="max-w-xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-2">Run Analysis</h1>
        <p className="text-sm font-body text-muted-foreground mb-8">Select a model and run your analysis.</p>

        {!running && !runResult && !runError && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5 animate-fade-up">
            {/* Model */}
            <div>
              <label className="text-sm font-body font-medium text-foreground block mb-1.5">Select Model</label>
              {modelsLoading ? <SkeletonLoader className="h-10 w-full rounded-lg" /> : (
                <SelectField
                  value={selectedModel}
                  onChange={setSelectedModel}
                  options={modelList.map((n: string) => ({ value: n, label: n }))}
                  placeholder="Choose a model…"
                />
              )}
            </div>

            {/* Input path */}
            <div>
              <label className="text-sm font-body font-medium text-foreground block mb-1.5">Input Data Location</label>
              <input
                type="text"
                value={inputPath}
                onChange={e => setInputPath(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-body text-foreground hover:border-border-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="Path to your data folder"
              />
              <p className="text-[11px] font-body text-muted-foreground mt-1.5">This is where your input data files are stored.</p>
            </div>

            {/* Processing mode */}
            <div>
              <label className="text-sm font-body font-medium text-foreground block mb-3">Processing Mode</label>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    processingMode === 'standard' ? 'border-primary bg-primary/5' : 'border-border hover:border-border-bright'
                  }`}
                >
                  <input
                    type="radio"
                    checked={processingMode === 'standard'}
                    onChange={() => setProcessingMode('standard')}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <div>
                    <span className="text-sm font-body font-medium text-foreground">Standard Processing</span>
                    <p className="text-[11px] font-body text-muted-foreground">Uses standard compute resources</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    processingMode === 'accelerated' ? 'border-primary bg-primary/5' : 'border-border hover:border-border-bright'
                  }`}
                >
                  <input
                    type="radio"
                    checked={processingMode === 'accelerated'}
                    onChange={() => setProcessingMode('accelerated')}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-body font-medium text-foreground">Accelerated Processing</span>
                    <div className="group relative">
                      <Info size={12} className="text-muted-foreground" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 rounded-lg bg-foreground text-background text-[10px] font-body shadow-lg z-50">
                        Uses GPU hardware for faster processing. Available on supported systems.
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRun}
                disabled={!selectedModel}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-base font-display font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20"
              >
                <Play size={16} /> Start Analysis
              </button>
            </div>
          </div>
        )}

        {/* Running */}
        {running && (
          <div className="rounded-xl border border-border bg-card p-12 shadow-sm text-center animate-fade-up">
            {/* Pulsing ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
              <Loader2 size={24} className="absolute inset-0 m-auto text-primary" />
            </div>
            <p className="text-base font-body font-medium text-foreground mb-2">{friendlyMessages[msgIndex]}</p>
            <p className="text-sm font-body text-muted-foreground">Running for {formatElapsed(elapsed)}</p>
          </div>
        )}

        {/* Success */}
        {runResult && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-8 text-center animate-fade-up shadow-sm">
            <CheckCircle2 size={44} className="text-success mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Analysis Complete</h2>
            <p className="text-sm font-body text-muted-foreground mb-6">
              Your analysis finished successfully{runResult.duration_seconds ? ` in ${formatElapsed(runResult.duration_seconds)}` : ''}.
            </p>
            <button
              onClick={() => navigate(`/results/${runResult.run_id}`)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-display font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all shadow-sm"
            >
              View Results <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Error */}
        {runError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center animate-fade-up shadow-sm">
            <AlertCircle size={44} className="text-destructive mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Analysis Failed</h2>
            <p className="text-sm font-body text-muted-foreground mb-6">
              The analysis encountered an error. Please ensure your data folder is correct and try again.
              If the problem persists, contact your technical support team.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setRunError(null); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-medium border border-border text-foreground hover:bg-surface-2 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showErrorDetails ? 'Hide' : 'View'} Error Details <ArrowRight size={12} />
              </button>
            </div>
            {showErrorDetails && (
              <div className="mt-4 p-4 rounded-lg bg-background border border-border text-left">
                <pre className="font-mono text-xs text-destructive whitespace-pre-wrap">{runError}</pre>
              </div>
            )}
          </div>
        )}
        <CrossModeHint
          devHint="Configure input path, timeout, GPU toggle, and see execution step logs"
          researcherHint="Try the simplified view with friendly progress messages"
        />
      </div>
    </AppLayout>
  );
}
