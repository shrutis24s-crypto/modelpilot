import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { listRuns } from '@/api/client';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { CrossModeHint } from '@/components/shared/CrossModeHint';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Activity, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { assignRunNumbers, versionColor, findFirstRunWithVersion } from '@/lib/runUtils';

function friendlyDate(d: string | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function friendlyStatus(s: string) {
  if (s === 'completed') return { label: 'Complete', icon: CheckCircle2, cls: 'text-success' };
  if (s === 'failed') return { label: 'Failed', icon: XCircle, cls: 'text-destructive' };
  return { label: 'In Progress', icon: Clock, cls: 'text-running' };
}

export default function ResearcherPastResults() {
  const navigate = useNavigate();
  const { refreshKey } = useRunsRefresh();
  const { data: runs, loading } = useApi<any[]>(() => listRuns(), [refreshKey]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const numberedRuns = useMemo(() => assignRunNumbers(runs ?? []), [runs]);

  const filtered = useMemo(() => {
    let list = numberedRuns;
    if (search) list = list.filter((r: any) => r.model?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') list = list.filter((r: any) => r.status === statusFilter);
    return list;
  }, [numberedRuns, search, statusFilter]);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-2">Past Analyses</h1>
      <p className="text-sm font-body text-muted-foreground mb-6">View and revisit all your previous model analyses.</p>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by model name…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-card text-sm font-body text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-card text-sm font-body text-foreground focus:border-primary outline-none transition-colors shadow-sm"
        >
          <option value="all">All Results</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} headline="No analyses found" />
      ) : (
        <div className="grid grid-cols-3 gap-4 stagger-fade-up">
          {filtered.map((run: any) => {
            const st = friendlyStatus(run.status);
            const verColor = versionColor(run.version);
            const firstSameVersion = findFirstRunWithVersion(numberedRuns, run.run_id, run.version);
            return (
              <div
                key={run.run_id}
                onClick={() => navigate(`/results/${run.run_id}`)}
                className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display text-base font-semibold text-foreground truncate">
                      Run {run.runNumber} — {run.model}
                    </span>
                    {verColor && firstSameVersion !== null && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-body flex-shrink-0"
                        style={{ background: `${verColor}99`, color: '#fff' }}
                        title={`This analysis used the same model setup as Run ${firstSameVersion}`}
                      >
                        v
                      </span>
                    )}
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-body font-medium ${st.cls}`}>
                    <st.icon size={12} /> {st.label}
                  </span>
                </div>
                <p className="text-xs font-body text-muted-foreground mb-3">
                  {friendlyDate(run.timestamp_utc)}
                </p>
                {run.score !== undefined && run.score !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary animate-fill-bar"
                        style={{ width: `${Math.min(run.score * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-display font-bold ${
                      run.score >= 0.8 ? 'text-success' : run.score >= 0.5 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {Math.round(run.score * 100)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CrossModeHint
        devHint="See run IDs, device info, and technical details for each run"
        researcherHint="Switch to a simplified view with friendly dates"
      />
    </AppLayout>
  );
}
