import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { listRuns, compareRuns, compareTwoRuns, compareSameModel } from '@/api/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RunIdDisplay } from '@/components/shared/RunIdDisplay';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useToastContext } from '@/context/ToastContext';
import { useRunsRefresh } from '@/context/RunsRefreshContext';
import { useState, useMemo } from 'react';
import { GitCompare, ArrowRight, Trophy, Sparkles, Trash2, AlertTriangle, Info } from 'lucide-react';
import { CrossModeHint } from '@/components/shared/CrossModeHint';
import { assignRunNumbers, versionColor, findFirstRunWithVersion, getRunNumberMap } from '@/lib/runUtils';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';

type ViewTab = 'table' | 'radar' | 'bar' | 'timeline';

const COLORS = ['#39D0FF', '#3FB950', '#A371F7', '#D29922', '#F85149', '#58A6FF'];

export default function DevCompare() {
  const { addToast } = useToastContext();
  const { refreshKey } = useRunsRefresh();
  const { data: runs, loading, error, refetch } = useApi<any[]>(() => listRuns(), [refreshKey]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparison, setComparison] = useState<any>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('table');

  const numberedRuns = useMemo(() => assignRunNumbers(runs ?? []), [runs]);
  const runNumberMap = useMemo(() => getRunNumberMap(runs ?? []), [runs]);

  // Pre-validation warning
  const preValidationWarning = useMemo(() => {
    if (selected.size < 2) return null;
    const warnings: string[] = [];
    selected.forEach(id => {
      const run = numberedRuns.find((r: any) => r.run_id === id);
      if (run && (run.status === 'failed' || run.status === 'incomplete')) {
        warnings.push(`Warning: Run ${run.runNumber} has status "${run.status}" and may not have metrics available for comparison.`);
      }
    });
    return warnings.length > 0 ? warnings : null;
  }, [selected, numberedRuns]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCompare = async () => {
    const ids = Array.from(selected);
    if (ids.length < 2) return;
    setComparing(true);
    setCompareError(null);
    try {
      const result = ids.length === 2
        ? await compareTwoRuns(ids[0], ids[1])
        : await compareRuns(ids);
      setComparison(result);
    } catch (e: any) {
      setCompareError(e.message || 'Unknown error');
      setComparison(null);
    } finally {
      setComparing(false);
    }
  };

  const handleCompareSameModel = async (runId: string) => {
    setComparing(true);
    setCompareError(null);
    try {
      const result = await compareSameModel(runId);
      setComparison(result);
    } catch (e: any) {
      setCompareError(e.message || 'Unknown error');
      setComparison(null);
    } finally {
      setComparing(false);
    }
  };

  const comparisonTable = comparison?.metrics ?? comparison?.comparison ?? [];
  const insights = comparison?.insights ?? [];
  const comparisonRuns = comparison?.runs ?? [];

  const rankedRuns = [...comparisonRuns].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
  const bestRunId = rankedRuns[0]?.run_id;

  const alsInsights = insights.filter((ins: string) => /als|sensitivity/i.test(ins));
  const normalInsights = insights.filter((ins: string) => !/als|sensitivity/i.test(ins));

  const radarData = Array.isArray(comparisonTable)
    ? comparisonTable.map((row: any) => {
        const entry: any = { metric: row.metric ?? row.name };
        comparisonRuns.forEach((r: any, i: number) => {
          entry[`run_${i}`] = row[r.run_id] ?? row.values?.[i] ?? 0;
        });
        return entry;
      })
    : [];

  const barChartData = radarData;

  const timelineData = comparisonRuns.map((r: any, i: number) => {
    const num = runNumberMap.get(r.run_id);
    const entry: any = { id: num ? `Run ${num}` : (r.run_id ?? '').slice(0, 8) };
    if (Array.isArray(comparisonTable)) {
      comparisonTable.forEach((row: any) => {
        entry[row.metric ?? row.name] = row[r.run_id] ?? row.values?.[i] ?? 0;
      });
    }
    return entry;
  });
  const metricNames = Array.isArray(comparisonTable)
    ? comparisonTable.map((r: any) => r.metric ?? r.name).filter(Boolean)
    : [];

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight mb-6">Compare Runs</h1>

      <div className="grid grid-cols-10 gap-4">
        {/* Left — Run selector (30%) */}
        <div className="col-span-3 rounded-md border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-body font-medium text-muted-foreground">Select Runs</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-primary">{selected.size} selected</span>
              {selected.size > 0 && (
                <button
                  onClick={() => { setSelected(new Set()); setComparison(null); setCompareError(null); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={9} /> Clear All
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4"><ErrorState message={error} onRetry={refetch} /></div>
          ) : numberedRuns.length === 0 ? (
            <EmptyState icon={GitCompare} headline="No runs to compare" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border/30">
              {numberedRuns.map((run: any) => {
                const verColor = versionColor(run.version);
                const firstSameVersion = findFirstRunWithVersion(numberedRuns, run.run_id, run.version);
                return (
                  <div key={run.run_id} className="px-4 py-2.5 hover:bg-surface-2/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(run.run_id)}
                        onChange={() => toggleSelect(run.run_id)}
                        className="mt-1 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-display font-semibold text-foreground">
                            Run {run.runNumber} — {run.model ?? run.model_name ?? 'Unknown'}
                          </span>
                          {verColor && firstSameVersion !== null && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono"
                              style={{ background: `${verColor}99`, color: '#fff' }}
                              title={`Same container version as Run ${firstSameVersion}`}
                            >
                              v
                            </span>
                          )}
                          <StatusBadge status={run.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <RunIdDisplay runId={run.run_id} />
                          {run.score !== undefined && (
                            <span className="font-mono text-[10px] text-primary">{(run.score * 100).toFixed(1)}%</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCompareSameModel(run.run_id)}
                          className="mt-1 text-[10px] font-body text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          Compare with previous <ArrowRight size={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pre-validation warnings */}
          {preValidationWarning && (
            <div className="px-4 py-2 space-y-1">
              {preValidationWarning.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md border border-warning/30 bg-warning/5">
                  <AlertTriangle size={12} className="text-warning mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] font-body text-warning">{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={handleCompare}
              disabled={selected.size < 2 || comparing}
              className="w-full h-8 rounded-md text-xs font-display font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {comparing ? 'Comparing…' : 'Compare Selected'}
            </button>
          </div>
        </div>

        {/* Right — Comparison view (70%) */}
        <div className="col-span-7">
          {/* Compare error card */}
          {compareError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-display font-semibold text-destructive mb-1">Could not compare selected runs.</h3>
                  <p className="text-xs font-mono text-destructive/80 mb-3">{compareError}</p>
                  <p className="text-[11px] font-body text-muted-foreground">
                    Common causes:<br />
                    — Selected runs have no output.json<br />
                    — Runs produced no recognisable metrics<br />
                    — Only one valid run was found after filtering
                  </p>
                </div>
              </div>
            </div>
          )}

          {!comparison && !compareError ? (
            <div className="rounded-md border border-border bg-surface">
              <EmptyState icon={GitCompare} headline="Select runs to compare" />
            </div>
          ) : comparison && (
            <div className="space-y-4">
              {/* Ranking table */}
              {rankedRuns.length > 0 && (
                <div className="rounded-md border border-border bg-surface overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <span className="text-xs font-body font-medium text-muted-foreground">Ranking</span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {rankedRuns.map((r: any, i: number) => {
                      const num = runNumberMap.get(r.run_id);
                      return (
                        <div
                          key={r.run_id}
                          className={`flex items-center justify-between px-4 py-3 ${
                            r.run_id === bestRunId ? 'border-l-2 border-l-primary bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-muted-foreground w-5">#{i + 1}</span>
                            <span className="text-sm font-display font-semibold text-foreground">
                              {num ? `Run ${num}` : (r.run_id ?? '').slice(0, 8)}
                            </span>
                            <RunIdDisplay runId={r.run_id} />
                            {r.model && <span className="text-xs font-body text-muted-foreground">{r.model}</span>}
                            {r.run_id === bestRunId && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body font-medium bg-primary/10 text-primary">
                                <Trophy size={10} /> Best
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-sm font-medium text-foreground">
                            {typeof r.score === 'number' ? `${(r.score * 100).toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View tabs */}
              <div className="flex gap-px border-b border-border">
                {(['table', 'radar', 'bar', 'timeline'] as ViewTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setViewTab(tab)}
                    className={`px-4 py-2 text-xs font-body font-medium transition-colors border-b-2 -mb-px capitalize ${
                      viewTab === tab
                        ? 'border-b-primary text-foreground'
                        : 'border-b-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {viewTab === 'table' && (
                <div className="animate-fade-up">
                  {Array.isArray(comparisonTable) && comparisonTable.length > 0 ? (
                    <div className="rounded-md border border-border bg-surface overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] font-mono text-muted-foreground border-b border-border">
                            <th className="text-left px-4 py-2 font-medium">Metric</th>
                            {comparisonRuns.map((r: any, i: number) => {
                              const num = runNumberMap.get(r.run_id);
                              return (
                                <th key={i} className="text-right px-4 py-2 font-medium">
                                  {num ? `Run ${num}` : (r.run_id ?? '').slice(0, 8)}
                                </th>
                              );
                            })}
                            {comparisonTable[0]?.diff !== undefined && (
                              <th className="text-right px-4 py-2 font-medium">Diff</th>
                            )}
                            {comparisonRuns.length === 2 && (
                              <th className="text-right px-4 py-2 font-medium">Winner</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonTable.map((row: any, i: number) => {
                            const vals = comparisonRuns.map((r: any, j: number) => row[r.run_id] ?? row.values?.[j] ?? 0);
                            const winnerIdx = vals.length === 2 ? (vals[0] >= vals[1] ? 0 : 1) : -1;
                            return (
                              <tr key={i} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/50'}`}>
                                <td className="px-4 py-2 font-body text-foreground">{row.metric ?? row.name}</td>
                                {comparisonRuns.map((r: any, j: number) => (
                                  <td key={j} className="text-right px-4 py-2 font-mono text-xs text-foreground">
                                    {typeof vals[j] === 'number' ? vals[j].toFixed(4) : '—'}
                                  </td>
                                ))}
                                {row.diff !== undefined && (
                                  <td className={`text-right px-4 py-2 font-mono text-xs ${
                                    row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                                  }`}>
                                    {row.diff > 0 ? '+' : ''}{row.diff?.toFixed(4)}
                                  </td>
                                )}
                                {winnerIdx >= 0 && (
                                  <td className="text-right px-4 py-2 font-mono text-xs text-primary">
                                    {(() => {
                                      const wId = comparisonRuns[winnerIdx]?.run_id;
                                      const wNum = runNumberMap.get(wId);
                                      return wNum ? `Run ${wNum}` : (wId ?? '').slice(0, 8);
                                    })()}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState icon={GitCompare} headline="No tabular data available" />
                  )}
                </div>
              )}

              {viewTab === 'radar' && (
                <div className="animate-fade-up rounded-md border border-border bg-surface p-5">
                  {radarData.length >= 3 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(213 14% 15%)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8B949E' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fontSize: 9, fill: '#3D444D' }} />
                        {comparisonRuns.map((_: any, i: number) => {
                          const num = runNumberMap.get(comparisonRuns[i]?.run_id);
                          return (
                            <Radar
                              key={i}
                              name={num ? `Run ${num}` : `Run ${i + 1}`}
                              dataKey={`run_${i}`}
                              stroke={COLORS[i % COLORS.length]}
                              fill={COLORS[i % COLORS.length]}
                              fillOpacity={0.15}
                            />
                          );
                        })}
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={GitCompare} headline="Need 3+ metrics for radar view" />
                  )}
                  <div className="flex gap-4 mt-3 justify-center">
                    {comparisonRuns.map((r: any, i: number) => {
                      const num = runNumberMap.get(r.run_id);
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="font-mono text-[10px] text-muted-foreground">{num ? `Run ${num}` : (r.run_id ?? '').slice(0, 8)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewTab === 'bar' && (
                <div className="animate-fade-up rounded-md border border-border bg-surface p-5">
                  {barChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(213 14% 15%)" />
                        <XAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8B949E' }} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8B949E' }} />
                        <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid #21262D', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                        {comparisonRuns.map((_: any, i: number) => {
                          const num = runNumberMap.get(comparisonRuns[i]?.run_id);
                          return (
                            <Bar key={i} dataKey={`run_${i}`} name={num ? `Run ${num}` : `Run ${i + 1}`} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={GitCompare} headline="No data for bar chart" />
                  )}
                </div>
              )}

              {viewTab === 'timeline' && (
                <div className="animate-fade-up rounded-md border border-border bg-surface p-5">
                  {timelineData.length > 0 && metricNames.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(213 14% 15%)" />
                        <XAxis dataKey="id" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8B949E' }} angle={-45} textAnchor="end" height={50} stroke="hsl(213 14% 15%)" />
                        <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8B949E' }} stroke="hsl(213 14% 15%)" />
                        <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid #21262D', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                        {metricNames.map((name: string, i: number) => (
                          <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={GitCompare} headline="No timeline data available" />
                  )}
                </div>
              )}

              {/* Insights */}
              {(normalInsights.length > 0 || alsInsights.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs font-body font-medium text-muted-foreground block">Insights</span>
                  {alsInsights.map((insight: string, i: number) => (
                    <div key={`als-${i}`} className="flex items-start gap-2.5 p-3 rounded-md border border-primary/30 bg-primary/5">
                      <Sparkles size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs font-body text-foreground">{insight}</span>
                    </div>
                  ))}
                  {normalInsights.map((insight: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-md border border-border bg-surface-2/50">
                      <ArrowRight size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-xs font-body text-muted-foreground">{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CrossModeHint
        devHint="Multi-run selection, same-model compare, and table/radar/bar/timeline views"
        researcherHint="Try the simplified side-by-side view with visual metric bars and a winner badge"
      />
    </AppLayout>
  );
}
