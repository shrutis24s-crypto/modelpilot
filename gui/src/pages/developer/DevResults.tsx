import { AppLayout } from '@/components/layout/AppLayout';
import { useApi } from '@/hooks/useApi';
import { getRun, getRunLogs, getRunOutput, getVisualReport } from '@/api/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DeviceBadge } from '@/components/shared/DeviceBadge';
import { RunIdDisplay } from '@/components/shared/RunIdDisplay';
import { MetricCard } from '@/components/shared/MetricCard';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { TerminalViewer } from '@/components/shared/TerminalViewer';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PerformanceReportModal } from '@/components/shared/PerformanceReportModal';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { BarChart3, FileText, Activity, Layers, Download, PieChart } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';

type Tab = 'outputs' | 'metrics' | 'logs' | 'artifacts';
type LogTab = 'stdout' | 'stderr';

export default function DevResults() {
  const { run_id } = useParams<{ run_id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('outputs');
  const [logTab, setLogTab] = useState<LogTab>('stdout');
  const [reportOpen, setReportOpen] = useState(false);

  const { data: run, loading: runLoading, error: runError } = useApi(() => getRun(run_id!), [run_id]);
  const { data: output, loading: outputLoading } = useApi(() => getRunOutput(run_id!), [run_id]);
  const { data: logs, loading: logsLoading } = useApi(() => getRunLogs(run_id!), [run_id]);
  const { data: report, loading: reportLoading } = useApi(() => getVisualReport(run_id!), [run_id]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'outputs', label: 'Outputs', icon: FileText },
    { id: 'metrics', label: 'Metrics', icon: Activity },
    { id: 'logs', label: 'Logs', icon: BarChart3 },
    { id: 'artifacts', label: 'Artifacts', icon: Layers },
  ];

  const metrics = report?.metrics ?? report?.classification_metrics ?? report?.regression_metrics ?? {};
  const metricEntries = Object.entries(metrics).filter(([, v]) => typeof v === 'number') as [string, number][];

  const radarData = metricEntries.map(([key, value]) => ({
    metric: key,
    value: typeof value === 'number' ? value : 0,
    fullMark: 1,
  }));

  const stdoutLines = typeof logs === 'string' ? logs.split('\n') :
    Array.isArray(logs) ? logs :
    logs?.stdout ? (typeof logs.stdout === 'string' ? logs.stdout.split('\n') : logs.stdout) :
    [];

  const stderrLines = logs?.stderr ?
    (typeof logs.stderr === 'string' ? logs.stderr.split('\n') : logs.stderr) : [];

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
        <SkeletonLoader className="h-16 w-full mb-6" />
      ) : runError ? (
        <ErrorState message={runError} />
      ) : run ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
                {run.model}
              </h1>
              <StatusBadge status={run.status} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <PieChart size={12} /> Performance Report
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-medium border border-border text-muted-foreground hover:text-foreground hover:border-border-bright transition-colors"
              >
                <Download size={12} /> Export
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="text-text-ghost">ID</span>
              <RunIdDisplay runId={run.run_id ?? run_id!} />
            </span>
            <span className="text-text-ghost">·</span>
            {run.version && <><span className="font-mono">{run.version}</span><span className="text-text-ghost">·</span></>}
            {run.duration_seconds && <><span className="font-mono">{run.duration_seconds >= 60 ? `${Math.floor(run.duration_seconds / 60)}m ${Math.floor(run.duration_seconds % 60)}s` : `${Math.floor(run.duration_seconds)}s`}</span><span className="text-text-ghost">·</span></>}
            {run.device && <DeviceBadge device={run.device} />}
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-body font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-b-primary text-foreground'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'outputs' && (
        <div className="animate-fade-up">
          {outputLoading ? <SkeletonLoader className="h-64 w-full" /> :
            output ? <JsonViewer data={output} /> :
            <EmptyState icon={FileText} headline="No output available" />}
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="animate-fade-up">
          {reportLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-28" />)}
            </div>
          ) : metricEntries.length === 0 ? (
            <EmptyState icon={Activity} headline="No metrics available" />
          ) : (
            <>
              {report?.task_type && (
                <div className="mb-4">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-medium bg-primary/10 text-primary uppercase tracking-wider">
                    {report.task_type}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mb-6 stagger-fade-up">
                {metricEntries.slice(0, 6).map(([key, value]) => (
                  <MetricCard
                    key={key}
                    label={key}
                    value={value}
                    highlight={key.toLowerCase() === 'score' || key.toLowerCase() === 'f1'}
                  />
                ))}
              </div>

              {radarData.length >= 3 && (
                <div className="rounded-md border border-border bg-surface p-5">
                  <span className="text-xs font-body font-medium text-muted-foreground block mb-4">Metric Distribution</span>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(213 14% 15%)" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8B949E' }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 1]}
                        tick={{ fontSize: 9, fill: '#3D444D' }}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#39D0FF"
                        fill="rgba(57,208,255,0.2)"
                        fillOpacity={1}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {report?.warnings && report.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {report.warnings.map((w: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                      <span className="text-xs font-body text-warning">{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="animate-fade-up">
          <div className="flex gap-px mb-4">
            {(['stdout', 'stderr'] as LogTab[]).map(t => (
              <button
                key={t}
                onClick={() => setLogTab(t)}
                className={`px-3 py-1.5 text-[11px] font-mono font-medium rounded-md transition-colors ${
                  logTab === t
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {logsLoading ? <SkeletonLoader className="h-64 w-full" /> :
            logTab === 'stdout' ? (
              stdoutLines.length > 0 ? <TerminalViewer lines={stdoutLines} /> :
              <EmptyState icon={BarChart3} headline="No stdout logs" />
            ) : (
              stderrLines.length > 0 ? <TerminalViewer lines={stderrLines} /> :
              <EmptyState icon={BarChart3} headline="No stderr logs" />
            )}
        </div>
      )}

      {activeTab === 'artifacts' && (
        <div className="animate-fade-up">
          {runLoading ? <SkeletonLoader className="h-64 w-full" /> :
            run ? (
              <div className="rounded-md border border-border bg-surface p-5 space-y-4">
                <span className="text-xs font-body font-medium text-muted-foreground block mb-2">Run Artifacts</span>
                <div className="space-y-2 text-sm">
                  {Object.entries(run).filter(([k]) => !['logs', 'output'].includes(k)).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-body">{k}</span>
                      <span className="font-mono text-xs text-foreground max-w-[60%] text-right truncate">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>

                {run.gpu_info && (
                  <div>
                    <span className="text-xs font-body font-medium text-muted-foreground block mb-2 mt-4">GPU Info</span>
                    <div className="space-y-1 text-sm">
                      {Object.entries(run.gpu_info).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-muted-foreground font-body">{k}</span>
                          <span className="font-mono text-xs text-gpu">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <EmptyState icon={Layers} headline="No artifact data" />}
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
