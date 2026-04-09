import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getRun, getRunLogs, getRunOutput, getVisualReport } from '@/api/client';
import { CircularGauge } from '@/components/shared/CircularGauge';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PerformanceReportModal } from '@/components/shared/PerformanceReportModal';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { FileText, Activity, ScrollText, CheckCircle2, AlertCircle, Copy, Download, PieChart } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';

type Tab = 'results' | 'performance' | 'log';

const FRIENDLY_METRIC_NAMES: Record<string, string> = {
  accuracy: 'Overall Accuracy',
  recall: 'Sensitivity',
  precision: 'Precision',
  f1: 'Balance Score',
  auc: 'Detection Score',
  score: 'Overall Score',
};

const METRIC_EXPLANATIONS: Record<string, string> = {
  accuracy: 'How often the model makes correct predictions overall',
  recall: 'How well the model detects positive cases',
  precision: 'How often positive predictions are correct',
  f1: 'A balanced measure of precision and sensitivity',
  auc: 'The model\'s ability to distinguish between classes',
  score: 'Overall performance score across all metrics',
};

function friendlyDate(d: string | undefined) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function friendlyDuration(s: number | undefined) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m} minute${m !== 1 ? 's' : ''} ${sec} second${sec !== 1 ? 's' : ''}` : `${sec} second${sec !== 1 ? 's' : ''}`;
}

export default function ResearcherResults() {
  const { run_id } = useParams<{ run_id: string }>();
  const { addToast } = useToastContext();
  const [activeTab, setActiveTab] = useState<Tab>('results');
  const [reportOpen, setReportOpen] = useState(false);

  const { data: run, loading: runLoading } = useApi(() => getRun(run_id!), [run_id]);
  const { data: output, loading: outputLoading } = useApi(() => getRunOutput(run_id!), [run_id]);
  const { data: logs, loading: logsLoading } = useApi(() => getRunLogs(run_id!), [run_id]);
  const { data: report, loading: reportLoading } = useApi(() => getVisualReport(run_id!), [run_id]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'results', label: 'Results', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'log', label: 'Activity Log', icon: ScrollText },
  ];

  const metrics = report?.metrics ?? report?.classification_metrics ?? report?.regression_metrics ?? {};
  const metricEntries = Object.entries(metrics).filter(([, v]) => typeof v === 'number') as [string, number][];

  const radarData = metricEntries.map(([key, value]) => ({
    metric: FRIENDLY_METRIC_NAMES[key.toLowerCase()] ?? key,
    value: typeof value === 'number' ? value : 0,
    fullMark: 1,
  }));

  const logLines = typeof logs === 'string' ? logs.split('\n') :
    Array.isArray(logs) ? logs :
    logs?.stdout ? (typeof logs.stdout === 'string' ? logs.stdout.split('\n') : logs.stdout) : [];

  const outputData = output;

  const handleCopyLogs = async () => {
    await navigator.clipboard.writeText(logLines.join('\n'));
    addToast('Activity log copied', 'success');
  };

  const handleExportJson = () => {
    const data = { run, report, output };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelpilot-results-${run_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      {/* Header */}
      {runLoading ? (
        <SkeletonLoader className="h-20 w-full rounded-xl mb-6" />
      ) : run ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              Results — {run.model}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-sm"
              >
                <PieChart size={13} /> Performance Report
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border-bright transition-colors shadow-sm bg-card"
              >
                <Download size={13} /> Export Results
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-body">
            {run.timestamp_utc && <span>Completed on {friendlyDate(run.timestamp_utc)}</span>}
            {run.duration_seconds && (
              <><span className="text-border-bright">·</span><span>Duration: {friendlyDuration(run.duration_seconds)}</span></>
            )}
            <span className="text-border-bright">·</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
              run.status === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}>
              {run.status === 'completed' ? <><CheckCircle2 size={11} /> Analysis Complete</> : <><AlertCircle size={11} /> Analysis Failed</>}
            </span>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-2 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-body font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results tab */}
      {activeTab === 'results' && (
        <div className="animate-fade-up">
          {outputLoading ? (
            <SkeletonLoader className="h-64 w-full rounded-xl" />
          ) : !outputData ? (
            <EmptyState icon={FileText} headline="No results available for this analysis" />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Analysis Results</h2>
              {Array.isArray(outputData) ? (
                <div>
                  <p className="text-sm font-body text-muted-foreground mb-4">
                    {outputData.length} samples analysed
                  </p>
                  <div className="overflow-auto max-h-[400px] rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-body font-medium text-muted-foreground bg-surface-2 sticky top-0">
                          <th className="text-left px-4 py-2">#</th>
                          {outputData[0] && typeof outputData[0] === 'object' &&
                            Object.keys(outputData[0]).map(k => (
                              <th key={k} className="text-left px-4 py-2">{k}</th>
                            ))
                          }
                        </tr>
                      </thead>
                      <tbody>
                        {outputData.slice(0, 50).map((row: any, i: number) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                            {typeof row === 'object' ? Object.values(row).map((v: any, j: number) => (
                              <td key={j} className="px-4 py-2 text-foreground">{String(v)}</td>
                            )) : <td className="px-4 py-2 text-foreground">{String(row)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : typeof outputData === 'object' ? (
                <div className="space-y-2">
                  {Object.entries(outputData).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm font-body text-muted-foreground">{k}</span>
                      <span className="text-sm font-body font-medium text-foreground">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-body text-foreground whitespace-pre-wrap">{String(outputData)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Performance tab */}
      {activeTab === 'performance' && (
        <div className="animate-fade-up">
          {reportLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : metricEntries.length === 0 ? (
            <EmptyState icon={Activity} headline="No performance data available" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-8 stagger-fade-up">
                {metricEntries.slice(0, 6).map(([key, value]) => (
                  <CircularGauge
                    key={key}
                    value={value}
                    label={FRIENDLY_METRIC_NAMES[key.toLowerCase()] ?? key}
                    sublabel={METRIC_EXPLANATIONS[key.toLowerCase()]}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm mb-6">
                <h3 className="font-display text-base font-semibold text-foreground mb-3">What This Means</h3>
                <div className="space-y-2">
                  {metricEntries.slice(0, 3).map(([key, value]) => {
                    const pct = Math.round(value * 100);
                    const name = FRIENDLY_METRIC_NAMES[key.toLowerCase()] ?? key;
                    return (
                      <p key={key} className="text-sm font-body text-muted-foreground">
                        {pct >= 80 ? '✓' : pct >= 60 ? '~' : '✗'} Your model has {pct >= 80 ? 'strong' : pct >= 60 ? 'moderate' : 'weak'} {name.toLowerCase()} at {pct}%
                      </p>
                    );
                  })}
                </div>
              </div>

              {radarData.length >= 3 && (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-display text-base font-semibold text-foreground mb-4">Performance Overview</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontFamily: 'Instrument Sans', fill: 'hsl(215 25% 40%)' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fontSize: 9, fill: 'hsl(215 16% 72%)' }} />
                      <Radar name="Score" dataKey="value" stroke="#0EA5E9" fill="rgba(14,165,233,0.15)" fillOpacity={1} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Activity Log tab */}
      {activeTab === 'log' && (
        <div className="animate-fade-up">
          {logsLoading ? (
            <SkeletonLoader className="h-64 w-full rounded-xl" />
          ) : logLines.length === 0 ? (
            <EmptyState icon={ScrollText} headline="No activity log available" />
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2">
                <span className="text-sm font-body font-medium text-foreground">Activity Log</span>
                <button onClick={handleCopyLogs} className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors">
                  <Copy size={12} /> Copy for support
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[400px] space-y-1">
                {logLines.filter((l: string) => l.trim()).map((line: string, i: number) => (
                  <div key={i} className="text-sm font-body text-muted-foreground py-0.5">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <PerformanceReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        run={run}
        report={report}
        output={output}
      />
    </AppLayout>
  );
}
