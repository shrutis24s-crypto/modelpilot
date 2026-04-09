import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { listRuns, compareTwoRuns } from '@/api/client';
import { SelectField } from '@/components/shared/SelectField';
import { HorizontalBar } from '@/components/shared/HorizontalBar';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToastContext } from '@/context/ToastContext';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { useState, useMemo } from 'react';
import { BarChart3, ArrowRight, Sparkles, Trophy, Info, AlertTriangle } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';
import { assignRunNumbers } from '@/lib/runUtils';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';

const FRIENDLY_NAMES: Record<string, string> = {
  accuracy: 'Overall Accuracy', recall: 'Sensitivity', precision: 'Precision',
  f1: 'Balance Score', auc: 'Detection Score', score: 'Overall Score',
};

function friendlyDate(d: string | undefined) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
}

export default function ResearcherCompare() {
  const { addToast } = useToastContext();
  const { refreshKey } = useRunsRefresh();
  const { data: runs, loading } = useApi<any[]>(() => listRuns(), [refreshKey]);
  const [run1, setRun1] = useState('');
  const [run2, setRun2] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const numberedRuns = useMemo(() => assignRunNumbers(runs ?? []), [runs]);

  const runOptions = numberedRuns.map((r: any) => {
    const date = r.timestamp_utc ?? r.started_at ?? r.date ?? r.timestamp;
    return {
      value: r.run_id,
      label: date ? `Run ${r.runNumber} — ${r.model ?? r.model_name ?? 'Unknown'} · ${friendlyDate(date)}` : `Run ${r.runNumber} — ${r.model ?? r.model_name ?? 'Unknown'}`,
    };
  });

  // Pre-validation
  const preValidationWarning = useMemo(() => {
    const warnings: string[] = [];
    [run1, run2].forEach(id => {
      if (!id) return;
      const run = numberedRuns.find((r: any) => r.run_id === id);
      if (run && (run.status === 'failed' || run.status === 'incomplete')) {
        warnings.push('One of your selected analyses did not complete successfully. Please choose a different analysis.');
      }
    });
    return warnings.length > 0 ? warnings[0] : null;
  }, [run1, run2, numberedRuns]);

  const handleCompare = async () => {
    if (!run1 || !run2) return;
    setComparing(true);
    setCompareError(null);
    try {
      const result = await compareTwoRuns(run1, run2);
      setComparison(result);
    } catch (e: any) {
      setCompareError(e.message || 'Unknown error');
      setComparison(null);
    } finally {
      setComparing(false);
    }
  };

  const comparisonMetrics = comparison?.metrics ?? comparison?.comparison ?? [];
  const comparisonRuns = comparison?.runs ?? [];
  const insights = comparison?.insights ?? [];

  const getRun = (id: string) => numberedRuns.find((r: any) => r.run_id === id);
  const run1Meta = getRun(run1) ?? {} as any;
  const run2Meta = getRun(run2) ?? {} as any;

  const run1Data = { ...run1Meta, ...comparisonRuns[0] };
  const run2Data = { ...run2Meta, ...comparisonRuns[1] };

  const run1Score = typeof run1Data.score === 'number' ? run1Data.score : null;
  const run2Score = typeof run2Data.score === 'number' ? run2Data.score : null;
  const winner = run1Score !== null && run2Score !== null ? (run1Score >= run2Score ? 1 : 2) : null;

  const alsInsights = insights.filter((ins: string) => /als|sensitivity/i.test(ins));
  const normalInsights = insights.filter((ins: string) => !/als|sensitivity/i.test(ins));

  const radarData = Array.isArray(comparisonMetrics)
    ? comparisonMetrics.map((row: any) => ({
        metric: FRIENDLY_NAMES[row.metric?.toLowerCase()] ?? row.metric ?? row.name,
        'Analysis 1': row[run1Data.run_id] ?? row.values?.[0] ?? 0,
        'Analysis 2': row[run2Data.run_id] ?? row.values?.[1] ?? 0,
      }))
    : [];

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-2">Compare Results</h1>
      <p className="text-sm font-body text-muted-foreground mb-8">Compare two analyses to see which performed better.</p>

      {/* Selection */}
      <div className="max-w-xl mx-auto mb-8 animate-fade-up relative z-30">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="relative z-20">
            <label className="text-sm font-body font-medium text-foreground block mb-1.5">First Analysis</label>
            {loading ? <SkeletonLoader className="h-10 w-full rounded-lg" /> : (
              <SelectField value={run1} onChange={setRun1} options={runOptions} placeholder="Choose first analysis…" />
            )}
          </div>
          <div className="relative z-10">
            <label className="text-sm font-body font-medium text-foreground block mb-1.5">Second Analysis</label>
            {loading ? <SkeletonLoader className="h-10 w-full rounded-lg" /> : (
              <SelectField value={run2} onChange={setRun2} options={runOptions} placeholder="Choose second analysis…" />
            )}
          </div>

          {/* Pre-validation warning */}
          {preValidationWarning && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-warning/30 bg-warning/5">
              <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
              <span className="text-sm font-body text-warning">{preValidationWarning}</span>
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={!run1 || !run2 || run1 === run2 || comparing}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-display font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20"
          >
            {comparing ? 'Comparing…' : 'Compare These Results'}
          </button>
        </div>
      </div>

      {/* Compare error - friendly info card */}
      {compareError && (
        <div className="max-w-xl mx-auto mb-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-display font-semibold text-foreground mb-2">These analyses could not be compared.</h3>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">
                  This usually happens when one or more selected analyses did not produce results, or the results are in a format that cannot be compared.
                </p>
                <p className="text-sm font-body text-muted-foreground mt-2">
                  Please select analyses that completed successfully and produced performance metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison result */}
      {comparison && (
        <div className="animate-fade-up space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            {[run1Data, run2Data].map((rd: any, i: number) => (
              <div
                key={i}
                className={`rounded-xl border p-6 shadow-sm transition-all ${
                  winner === i + 1 ? 'border-success bg-success/5' : 'border-border bg-card'
                }`}
              >
                {winner === i + 1 && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Trophy size={14} className="text-success" />
                    <span className="text-xs font-body font-medium text-success">Better Performance</span>
                  </div>
                )}
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                  {i === 0 && run1Meta.runNumber ? `Run ${run1Meta.runNumber}` : i === 1 && run2Meta.runNumber ? `Run ${run2Meta.runNumber}` : `Analysis ${i + 1}`}
                </h3>
                <p className="text-sm font-body text-muted-foreground">{rd.model ?? rd.model_name ?? '—'}</p>
                <p className="text-xs font-body text-muted-foreground/70 mt-0.5">{friendlyDate(rd.timestamp_utc ?? rd.started_at ?? rd.date ?? rd.timestamp)}</p>
                <div className="mt-3 font-display text-2xl font-bold text-foreground">
                  {rd.score == null ? 'No data' : `${Math.round(Math.min(rd.score, 1) * 100)}%`}
                </div>
              </div>
            ))}
          </div>

          {/* Pairwise differences */}
          {Array.isArray(comparisonMetrics) && comparisonMetrics.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h3 className="font-display text-base font-semibold text-foreground">Metric Comparison</h3>
              {comparisonMetrics.map((row: any, i: number) => {
                const name = FRIENDLY_NAMES[row.metric?.toLowerCase()] ?? row.metric ?? row.name;
                const v1 = row[run1Data.run_id] ?? row.values?.[0] ?? 0;
                const v2 = row[run2Data.run_id] ?? row.values?.[1] ?? 0;
                const diff = v1 - v2;
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-body font-medium text-foreground">{name}</span>
                      <span className={`text-xs font-mono ${diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {diff > 0 ? '+' : ''}{(diff * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-body text-muted-foreground w-16">
                          {run1Meta.runNumber ? `Run ${run1Meta.runNumber}` : 'Analysis 1'}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-primary animate-fill-bar" style={{ width: `${v1 * 100}%` }} />
                        </div>
                        <span className="text-xs font-body font-medium w-10 text-right">{Math.round(v1 * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-body text-muted-foreground w-16">
                          {run2Meta.runNumber ? `Run ${run2Meta.runNumber}` : 'Analysis 2'}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-running animate-fill-bar" style={{ width: `${v2 * 100}%` }} />
                        </div>
                        <span className="text-xs font-body font-medium w-10 text-right">{Math.round(v2 * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Insights */}
          {(normalInsights.length > 0 || alsInsights.length > 0) && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-base font-semibold text-foreground mb-3">Key Insights</h3>
              <div className="space-y-2">
                {alsInsights.map((insight: string, i: number) => (
                  <div key={`als-${i}`} className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <Sparkles size={14} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-body text-foreground">{insight}</span>
                  </div>
                ))}
                {normalInsights.map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <ArrowRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-body text-foreground">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Radar chart */}
          {radarData.length >= 3 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-base font-semibold text-foreground mb-4">Performance Overview</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontFamily: 'Instrument Sans', fill: 'hsl(215 25% 40%)' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fontSize: 9, fill: 'hsl(215 16% 72%)' }} />
                  <Radar name={run1Meta.runNumber ? `Run ${run1Meta.runNumber}` : 'Analysis 1'} dataKey="Analysis 1" stroke="#0EA5E9" fill="rgba(14,165,233,0.15)" fillOpacity={1} />
                  <Radar name={run2Meta.runNumber ? `Run ${run2Meta.runNumber}` : 'Analysis 2'} dataKey="Analysis 2" stroke="#6366F1" fill="rgba(99,102,241,0.15)" fillOpacity={1} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-xs font-body text-muted-foreground">{run1Meta.runNumber ? `Run ${run1Meta.runNumber}` : 'Analysis 1'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-running" />
                  <span className="text-xs font-body text-muted-foreground">{run2Meta.runNumber ? `Run ${run2Meta.runNumber}` : 'Analysis 2'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!comparison && !compareError && !loading && (
        <div className="text-center py-8">
          <BarChart3 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Select two analyses above to compare their results.</p>
        </div>
      )}
      <CrossModeHint
        devHint="Compare 3+ runs at once, same-model compare, and table/radar/bar/timeline views"
        researcherHint="Try the simplified side-by-side view with visual metric bars"
      />
    </AppLayout>
  );
}
