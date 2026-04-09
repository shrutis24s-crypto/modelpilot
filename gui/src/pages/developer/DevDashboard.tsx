import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { listRuns, getModels } from '@/api/client';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DeviceBadge } from '@/components/shared/DeviceBadge';
import { RunIdDisplay } from '@/components/shared/RunIdDisplay';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { MetricCard } from '@/components/shared/MetricCard';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Box, Activity, Clock, Hammer, Play, GitCompare, FileText } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { assignRunNumbers, versionColor, findFirstRunWithVersion } from '@/lib/runUtils';
import { useMemo } from 'react';

export default function DevDashboard() {
  const navigate = useNavigate();
  const { refreshKey } = useRunsRefresh();
  const { data: runs, loading: runsLoading, error: runsError, refetch: refetchRuns } = useApi<any[]>(() => listRuns(), [refreshKey]);
  const { data: models, loading: modelsLoading, error: modelsError, refetch: refetchModels } = useApi<any[]>(() => getModels(), [refreshKey]);

  const totalModels = models?.length ?? 0;
  const totalRuns = runs?.length ?? 0;
  const completedRuns = runs?.filter((r: any) => r.status === 'completed') ?? [];
  const successRate = totalRuns > 0 ? Math.round((completedRuns.length / totalRuns) * 100) : 0;
  const avgDuration = completedRuns.length > 0
    ? Math.round(completedRuns.reduce((s: number, r: any) => s + (r.duration_seconds ?? 0), 0) / completedRuns.length)
    : 0;

  const numberedAll = useMemo(() => assignRunNumbers(runs ?? []), [runs]);

  const recentRuns = useMemo(() => {
    return [...numberedAll].sort((a, b) => {
      // Try every possible timestamp field
      const tA = a.timestamp_utc || a.started_at || a.date || a.timestamp || '';
      const tB = b.timestamp_utc || b.started_at || b.date || b.timestamp || '';
      const dA = new Date(tA).getTime();
      const dB = new Date(tB).getTime();
      // If both invalid, sort by runNumber descending
      if (isNaN(dA) && isNaN(dB)) return b.runNumber - a.runNumber;
      if (isNaN(dA)) return 1;
      if (isNaN(dB)) return -1;
      return dB - dA;
    }).slice(0, 10); // use 6 for researcher
  }, [numberedAll]);

  const mostRecentRunId = recentRuns[0]?.run_id;

  const runsWithMetrics = completedRuns.filter((r: any) => r.metrics || r.score !== undefined);
  const avgMetrics: Record<string, number> = {};
  if (runsWithMetrics.length > 0) {
    const metricKeys = new Set<string>();
    runsWithMetrics.forEach((r: any) => {
      if (r.metrics) Object.keys(r.metrics).forEach(k => metricKeys.add(k));
      if (r.score !== undefined) metricKeys.add('score');
    });
    metricKeys.forEach(k => {
      const vals = runsWithMetrics
        .map((r: any) => k === 'score' ? r.score : r.metrics?.[k])
        .filter((v: any) => typeof v === 'number');
      if (vals.length > 0) avgMetrics[k] = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    });
  }
  const avgMetricEntries = Object.entries(avgMetrics).filter(([, v]) => typeof v === 'number') as [string, number][];

  return (
    <AppLayout>
      <h1 className="font-body text-xl font-semibold text-foreground tracking-tight mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6 stagger-fade-up">
        <StatCard label="Total Models" value={totalModels} icon={Box} />
        <StatCard label="Total Runs" value={totalRuns} icon={Activity} />
        <StatCard label="Success Rate" value={successRate} suffix="%" icon={BarChart3} />
        <StatCard label="Avg Duration" value={avgDuration} suffix="s" icon={Clock} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => navigate('/build')}
          className="flex items-center justify-center gap-2 h-10 rounded-md text-xs font-display font-semibold transition-all duration-250 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #0D2137, #0A3D52)',
            border: '1px solid #39D0FF',
            color: '#39D0FF',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(57,208,255,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <Hammer size={13} /> Load & Build
        </button>
        <button
          onClick={() => navigate('/run')}
          className="flex items-center justify-center gap-2 h-10 rounded-md text-xs font-display font-semibold transition-all duration-250 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #0D2B1A, #0A4A2A)',
            border: '1px solid #3FB950',
            color: '#3FB950',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(63,185,80,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <Play size={13} /> Run Model
        </button>
        <button
          onClick={() => navigate('/compare')}
          className="flex items-center justify-center gap-2 h-10 rounded-md text-xs font-display font-semibold transition-all duration-250 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #1A0D37, #2D0A52)',
            border: '1px solid #A371F7',
            color: '#A371F7',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(163,113,247,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <GitCompare size={13} /> Compare Runs
        </button>
        <button
          onClick={() => navigate(mostRecentRunId ? `/results/${mostRecentRunId}` : '/past-results')}
          className="flex items-center justify-center gap-2 h-10 rounded-md text-xs font-display font-semibold transition-all duration-250 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #2B1A0D, #4A2A0A)',
            border: '1px solid #D29922',
            color: '#D29922',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(210,153,34,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <FileText size={13} /> Latest Results
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Recent Runs — 60% */}
        <div className="col-span-3 rounded-md border border-border bg-surface transition-all duration-200 hover:-translate-y-[1px] hover:border-border-bright hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-xs font-body font-medium text-muted-foreground">Recent Runs</span>
          </div>
          {runsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} className="h-10 w-full" />)}
            </div>
          ) : runsError ? (
            <div className="p-5"><ErrorState message={runsError} onRetry={refetchRuns} /></div>
          ) : recentRuns.length === 0 ? (
            <EmptyState icon={Activity} headline="No runs yet" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                 <tr className="text-[11px] font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-2 font-medium">Run</th>
                  <th className="text-left px-3 py-2 font-medium">Model</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Device</th>
                  <th className="text-right px-3 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="stagger-rows">
                {recentRuns.map((run: any, i: number) => (
                  <tr
                    key={run.run_id}
                    onClick={() => navigate(`/results/${run.run_id}`)}
                    className={`cursor-pointer transition-all duration-150 border-b border-border/50 hover:border-l-2 hover:border-l-primary ${
                      i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/50'
                    }`}
                    style={{ ['--tw-bg-opacity' as any]: undefined }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(57,208,255,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-semibold text-foreground">Run {run.runNumber ?? '?'}</span>
                        {(() => {
                          const verColor = versionColor(run.version);
                          const firstSame = findFirstRunWithVersion(numberedAll, run.run_id, run.version);
                          return verColor && firstSame !== null ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: `${verColor}99`, color: '#fff' }} title={`Same container version as Run ${firstSame}`}>v</span>
                          ) : null;
                        })()}
                      </div>
                      <RunIdDisplay runId={run.run_id} />
                    </td>
                    <td className="px-3 py-2.5 font-body text-foreground">{run.model}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={run.status} /></td>
                    <td className="px-3 py-2.5">
                      {run.device && <DeviceBadge device={run.device} />}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                      {run.duration_seconds ? (run.duration_seconds >= 60 ? `${Math.floor(run.duration_seconds / 60)}m ${Math.floor(run.duration_seconds % 60)}s` : `${Math.floor(run.duration_seconds)}s`) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Model Builds — 40% */}
        <div className="col-span-2 rounded-md border border-border bg-surface transition-all duration-200 hover:-translate-y-[1px] hover:border-border-bright hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-xs font-body font-medium text-muted-foreground">Model Builds</span>
          </div>
          {modelsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} className="h-12 w-full" />)}
            </div>
          ) : modelsError ? (
            <div className="p-5"><ErrorState message={modelsError} onRetry={refetchModels} /></div>
          ) : (models ?? []).length === 0 ? (
            <EmptyState icon={Box} headline="No models loaded" />
          ) : (
            <div className="divide-y divide-border/50">
              {(models ?? []).map((m: any) => {
                const name = typeof m === 'string' ? m : m.name ?? m;
                const buildSource = typeof m === 'object' ? m.build_source : undefined;
                return (
                  <div key={name} className="group flex items-center justify-between px-5 py-3 hover:bg-surface-2/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-foreground truncate group-hover:text-[#E6EDF3] transition-colors">{name}</span>
                      {buildSource && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                          buildSource === 'auto' ? 'bg-primary/10 text-primary' : 'bg-gpu/10 text-gpu'
                        }`}>
                          {buildSource === 'auto' ? 'Auto' : 'Custom'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/build?model=${encodeURIComponent(name)}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-body font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border-bright transition-colors"
                      >
                        <Hammer size={11} /> Build
                      </button>
                      <button
                        onClick={() => navigate(`/run?model=${encodeURIComponent(name)}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors group-hover:shadow-[0_0_10px_rgba(57,208,255,0.2)]"
                      >
                        <Play size={11} /> Run
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Performance Overview */}
      {avgMetricEntries.length > 0 && (
        <div className="rounded-md border border-border bg-surface p-5 animate-fade-up transition-all duration-200 hover:-translate-y-[1px] hover:border-border-bright hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-body font-medium text-muted-foreground">Performance Overview</span>
            <span className="text-[10px] font-body text-muted-foreground/70">Average performance across all completed runs</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {avgMetricEntries.slice(0, 5).map(([key, value]) => (
              <MetricCard key={key} label={key} value={value} />
            ))}
          </div>
        </div>
      )}

      <CrossModeHint
        devHint="Get detailed performance charts, device info, and score breakdowns"
        researcherHint="Switch to a simpler view with guided actions and friendly stats"
      />
    </AppLayout>
  );
}
