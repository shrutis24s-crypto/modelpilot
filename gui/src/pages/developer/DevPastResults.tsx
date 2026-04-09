import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { listRuns } from '@/api/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DeviceBadge } from '@/components/shared/DeviceBadge';
import { RunIdDisplay } from '@/components/shared/RunIdDisplay';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { CrossModeHint } from '@/components/shared/CrossModeHint';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Activity, Search } from 'lucide-react';
import { assignRunNumbers, versionColor, findFirstRunWithVersion } from '@/lib/runUtils';

function formatDate(d: string | undefined) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const m = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${day} ${h}:${m}`;
  } catch { return d; }
}

export default function DevPastResults() {
  const navigate = useNavigate();
  const { refreshKey } = useRunsRefresh();
  const { data: runs, loading, error, refetch } = useApi<any[]>(() => listRuns(), [refreshKey]);
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
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-6">Past Results</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by model name…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm font-body text-foreground hover:border-border-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm font-body text-foreground hover:border-border-bright focus:border-primary outline-none transition-colors"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-40 rounded-md" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} headline="No runs found" />
      ) : (
        <div className="grid grid-cols-3 gap-4 stagger-fade-up">
          {filtered.map((run: any) => {
            const verColor = versionColor(run.version);
            const firstSameVersion = findFirstRunWithVersion(numberedRuns, run.run_id, run.version);
            return (
              <div
                key={run.run_id}
                onClick={() => navigate(`/results/${run.run_id}`)}
                className="rounded-md border border-border bg-surface p-5 cursor-pointer hover:border-border-bright hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display text-sm font-semibold text-foreground truncate">
                      Run {run.runNumber} — {run.model}
                    </span>
                    {verColor && firstSameVersion !== null && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono flex-shrink-0"
                        style={{ background: `${verColor}99`, color: '#fff' }}
                        title={`Same container version as Run ${firstSameVersion}`}
                      >
                        v
                      </span>
                    )}
                  </div>
                  <StatusBadge status={run.status} />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-body">ID</span>
                    <RunIdDisplay runId={run.run_id} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-body">Date</span>
                    <span className="font-mono text-foreground">{formatDate(run.timestamp_utc)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-body">Duration</span>
                    <span className="font-mono text-foreground">{run.duration_seconds ? (run.duration_seconds >= 60 ? `${Math.floor(run.duration_seconds / 60)}m ${Math.floor(run.duration_seconds % 60)}s` : `${Math.floor(run.duration_seconds)}s`) : '—'}</span>
                  </div>
                  {run.device && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-body">Device</span>
                      <DeviceBadge device={run.device} />
                    </div>
                  )}
                  {run.score !== undefined && run.score !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-body">Score</span>
                      <span className={`font-mono font-medium ${
                        run.score >= 0.8 ? 'text-success' : run.score >= 0.5 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {(run.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CrossModeHint
        devHint="See run IDs, device info, and technical details for each run"
        researcherHint="Switch to a simplified view with friendly dates and no run IDs"
      />
    </AppLayout>
  );
}
