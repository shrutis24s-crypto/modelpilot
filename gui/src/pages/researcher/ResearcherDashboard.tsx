import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { listRuns, getModels } from '@/api/client';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { Play, BarChart3, FlaskConical, Activity, CheckCircle2, Sparkles, Hammer, History } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';
import { useCountUp } from '@/hooks/useCountUp';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { assignRunNumbers, versionColor, findFirstRunWithVersion } from '@/lib/runUtils';
import { useMemo } from 'react';

function FriendlyStatCard({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  const display = useCountUp(value, 1000);
  return (
    <div
      className="rounded-xl p-6 transition-all duration-250 hover:-translate-y-[3px]"
      style={{
        borderTop: '3px solid #0EA5E9',
        background: 'white',
        border: '1px solid hsl(214 32% 91%)',
        borderTopColor: '#0EA5E9',
        borderTopWidth: '3px',
        boxShadow: '0 4px 20px rgba(14,165,233,0.08), 0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(14,165,233,0.15)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(14,165,233,0.08), 0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(14,165,233,0.1)' }}>
        <Icon size={22} className="text-primary" />
      </div>
      <div className="font-display text-3xl font-bold text-foreground">{display}</div>
      <span className="text-sm font-body text-muted-foreground mt-1 block">{label}</span>
    </div>
  );
}

function formatDate(d: string | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function friendlyStatus(s: string) {
  if (s === 'completed') return 'Complete';
  if (s === 'failed') return 'Failed';
  if (s === 'running') return 'Running…';
  if (s === 'building') return 'Preparing…';
  return s;
}

function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <span key={i} className="animate-word" style={{ animationDelay: `${i * 80}ms`, marginRight: '0.3em' }}>
          {word}
        </span>
      ))}
    </>
  );
}

export default function ResearcherDashboard() {
  const navigate = useNavigate();
  const { refreshKey } = useRunsRefresh();
  const { data: runs, loading: runsLoading } = useApi<any[]>(() => listRuns(), [refreshKey]);
  const { data: models, loading: modelsLoading } = useApi<any[]>(() => getModels(), [refreshKey]);

  const totalModels = models?.length ?? 0;
  const totalRuns = runs?.length ?? 0;
  const successfulRuns = runs?.filter((r: any) => r.status === 'completed').length ?? 0;
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

  return (
    <AppLayout>
      {/* Hero */}
      <div
        className="rounded-2xl p-8 mb-8 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0369A1 0%, #0EA5E9 45%, #06B6D4 80%, #0891B2 100%)' }}
      >
        {/* Decorative blurred circles */}
        <div className="absolute pointer-events-none" style={{ width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -100, right: -80, filter: 'blur(40px)' }} />
        <div className="absolute pointer-events-none" style={{ width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -80, left: 100, filter: 'blur(60px)' }} />

        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold mb-2">
            <AnimatedHeadline text="Welcome to ModelPilot" />
          </h1>
          <p className="font-body text-base text-white/80 max-w-lg mb-6">
            Run and evaluate machine learning models — no technical setup required.
            Designed for ALS and biomedical research.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/build')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-body font-semibold bg-white text-[#0EA5E9] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
            >
              <Play size={14} /> Run a Model
            </button>
            <button
              onClick={() => navigate('/past-results')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-body font-semibold bg-white/15 text-white border border-white/20 transition-all duration-200 hover:bg-white/25 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
            >
              <BarChart3 size={14} /> View Past Results
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 stagger-fade-up">
        {modelsLoading || runsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <FriendlyStatCard icon={FlaskConical} value={totalModels} label="Models Available" />
            <FriendlyStatCard icon={Activity} value={totalRuns} label="Analyses Run" />
            <FriendlyStatCard icon={CheckCircle2} value={successfulRuns} label="Successful Analyses" />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => navigate('/build')}
          className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-body font-semibold text-white transition-all duration-250 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #0369A1, #0EA5E9)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
        >
          <Hammer size={14} /> Prepare Model
        </button>
        <button
          onClick={() => navigate('/run')}
          className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-body font-semibold text-white transition-all duration-250 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
        >
          <Play size={14} /> Run Analysis
        </button>
        <button
          onClick={() => navigate('/compare')}
          className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-body font-semibold text-white transition-all duration-250 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
        >
          <BarChart3 size={14} /> Compare Results
        </button>
        <button
          onClick={() => navigate(mostRecentRunId ? `/results/${mostRecentRunId}` : '/past-results')}
          className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-body font-semibold text-white transition-all duration-250 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
        >
          <History size={14} /> Latest Results
        </button>
      </div>

      {/* Recent Analyses */}
      <div
        className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-250 hover:-translate-y-[3px]"
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(14,165,233,0.12)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'; }}
      >
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-foreground">Recent Analyses</h2>
        </div>
        {runsLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="py-12 text-center">
            <Activity size={36} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-body text-muted-foreground">No analyses yet. Run your first model to see results here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-body font-medium text-muted-foreground border-b border-border">
                <th className="text-left px-6 py-3">Model Name</th>
                <th className="text-left px-4 py-3">Date & Time</th>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-right px-6 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="stagger-rows">
              {recentRuns.map((run: any) => (
                <tr
                  key={run.run_id}
                  onClick={() => navigate(`/results/${run.run_id}`)}
                  className="cursor-pointer transition-all duration-150 border-b border-border/50 last:border-0 hover:border-l-2 hover:border-l-primary"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td className="px-6 py-3.5 font-body font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span>Run {run.runNumber ?? '?'} — {run.model}</span>
                      {(() => {
                        const verColor = versionColor(run.version);
                        const firstSame = findFirstRunWithVersion(numberedAll, run.run_id, run.version);
                        return verColor && firstSame !== null ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-body" style={{ background: `${verColor}99`, color: '#fff' }} title={`This analysis used the same model setup as Run ${firstSame}`}>v</span>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-body text-muted-foreground">{formatDate(run.timestamp_utc)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-body font-medium px-2.5 py-1 rounded-full ${
                      run.status === 'completed' ? 'bg-success/10 text-success animate-pulse-green' :
                      run.status === 'failed' ? 'bg-destructive/10 text-destructive animate-flash-red' :
                      run.status === 'running' ? 'bg-running/10 text-running animate-pulse-glow' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {run.status === 'completed' && <CheckCircle2 size={12} />}
                      {friendlyStatus(run.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-body text-muted-foreground">
                    {run.duration_seconds ? (run.duration_seconds >= 60 ? `${Math.floor(run.duration_seconds / 60)}m ${Math.floor(run.duration_seconds % 60)}s` : `${Math.floor(run.duration_seconds)}s`) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <CrossModeHint
        devHint="See performance charts, device info, and granular score breakdowns"
        researcherHint="Switch to a simpler view with guided actions and friendly stats"
      />
    </AppLayout>
  );
}
