import { useRef, useState } from 'react';
import { X, Download, Clock, Cpu, CheckCircle2, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import { useMode } from '@/context/ModeContext';
import { CircularGauge } from '@/components/shared/CircularGauge';
import { MetricCard } from '@/components/shared/MetricCard';
import { RunIdDisplay } from '@/components/shared/RunIdDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface PerformanceReportModalProps {
  open: boolean;
  onClose: () => void;
  run: any;
  report: any;
  output: any;
}

export function PerformanceReportModal({ open, onClose, run, report, output }: PerformanceReportModalProps) {
  const { mode } = useMode();
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const isDev = mode === 'developer';
  const accentColor = isDev ? '#39D0FF' : '#0EA5E9';

  if (!open) return null;

  const metrics = report?.metrics ?? report?.classification_metrics ?? report?.regression_metrics ?? {};
  const metricEntries = Object.entries(metrics).filter(([, v]) => typeof v === 'number') as [string, number][];
  const warnings = report?.warnings ?? [];
  const EXCLUDE_FROM_SCORE = ['loss', 'mse', 'mae', 'rmse', 'error'];
  const score = report?.score ?? report?.weighted_score ?? (metricEntries.length > 0
    ? (() => {
        const perfMetrics = metricEntries.filter(([k, v]) => 
          !EXCLUDE_FROM_SCORE.includes(k.toLowerCase()) && v >= 0 && v <= 1
        );
        return perfMetrics.length > 0
          ? perfMetrics.reduce((s, [, v]) => s + v, 0) / perfMetrics.length
          : 0;
      })()
    : 0);

  const totalPredictions = Array.isArray(output) ? output.length : (output && typeof output === 'object' ? Object.keys(output).length : 0);

  const radarData = metricEntries.map(([key, value]) => ({
    metric: key, value, fullMark: 1,
  }));

  const barData = metricEntries.map(([key, value]) => ({
    metric: key, value: +(value * 100).toFixed(1),
  }));

  // ALS insight
  const recallEntry = metricEntries.find(([k]) => k.toLowerCase() === 'recall');
  const highestMetric = metricEntries.length > 0
    ? metricEntries.reduce((a, b) => b[1] > a[1] ? b : a)
    : null;
  const showAlsInsight = highestMetric && recallEntry && highestMetric[0].toLowerCase() === 'recall';

  const handleExportPdf = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: isDev ? '#080C10' : '#f0f4f8' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 10;
      if (imgH <= pageH - 20) {
        pdf.addImage(imgData, 'PNG', 10, y, imgW, imgH);
      } else {
        // Multi-page
        let remainingH = imgH;
        let sourceY = 0;
        while (remainingH > 0) {
          const sliceH = Math.min(remainingH, pageH - 20);
          pdf.addImage(imgData, 'PNG', 10, y, imgW, imgH, undefined, 'FAST', 0);
          remainingH -= sliceH;
          sourceY += sliceH;
          if (remainingH > 0) pdf.addPage();
        }
      }
      pdf.save(`modelpilot-report-${run?.run_id ?? 'unknown'}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto">
      <div className="w-full max-w-5xl my-8 mx-4 rounded-lg border border-border bg-background shadow-2xl animate-scale-fade-in">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="font-display text-lg font-bold text-foreground">Performance Report</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              <Download size={12} /> {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-6 space-y-6">
          {/* Stat cards row */}
          <div className="grid grid-cols-4 gap-3 stagger-fade-up">
            <div className="rounded-md border border-border bg-surface p-4">
              <Clock size={14} className="text-muted-foreground mb-2" />
              <div className="font-display text-xl font-bold text-foreground">
                {run?.duration_seconds ? (run.duration_seconds >= 60 ? `${Math.floor(run.duration_seconds / 60)}m ${Math.floor(run.duration_seconds % 60)}s` : `${Math.floor(run.duration_seconds)}s`) : '—'}
              </div>
              <span className="text-[11px] font-body text-muted-foreground">Run Duration</span>
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <Cpu size={14} className="text-muted-foreground mb-2" />
              <div className="font-display text-xl font-bold text-foreground">
                {run?.device ?? 'CPU'}
              </div>
              <span className="text-[11px] font-body text-muted-foreground">Execution Mode</span>
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <CheckCircle2 size={14} className="text-muted-foreground mb-2" />
              <div className="font-display text-xl font-bold text-foreground">
                {run?.status ?? '—'}
              </div>
              <span className="text-[11px] font-body text-muted-foreground">Status</span>
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <Activity size={14} className="text-muted-foreground mb-2" />
              <div className="font-display text-xl font-bold text-foreground">
                {totalPredictions}
              </div>
              <span className="text-[11px] font-body text-muted-foreground">Total Predictions</span>
            </div>
          </div>

          {/* Large circular gauge */}
          <div className="flex justify-center py-4">
            <div className="flex flex-col items-center">
              <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={100} cy={100} r={88} fill="none" stroke="hsl(var(--border))" strokeWidth={10} />
                <circle
                  cx={100} cy={100} r={88} fill="none"
                  stroke={accentColor}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - Math.min(score, 1))}
                  className="transition-all duration-[1200ms] ease-out"
                />
              </svg>
              <div className="relative -mt-[130px] flex flex-col items-center mb-[60px]">
                <span className="font-display text-4xl font-bold text-foreground">{(score * 100).toFixed(1)}%</span>
                <span className="text-xs font-body text-muted-foreground mt-1">Weighted Score</span>
              </div>
            </div>
          </div>

          {/* Charts side by side */}
          {metricEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {radarData.length >= 3 && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <span className="text-xs font-body font-medium text-muted-foreground block mb-3">Radar — All Metrics</span>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fontSize: 9, fill: 'hsl(var(--text-ghost))' }} />
                      <Radar name="Score" dataKey="value" stroke={accentColor} fill={accentColor} fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="rounded-md border border-border bg-surface p-4">
                <span className="text-xs font-body font-medium text-muted-foreground block mb-3">Bar — All Metrics</span>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px', fontFamily: 'JetBrains Mono' }} />
                    <Bar dataKey="value" fill={accentColor} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed metrics */}
          {metricEntries.length > 0 && (
            <div>
              <span className="text-xs font-body font-medium text-muted-foreground block mb-3">Detailed Metrics</span>
              <div className="grid grid-cols-3 gap-3 stagger-fade-up">
                {metricEntries.map(([key, value]) => (
                  <MetricCard key={key} label={key} value={value} highlight={key.toLowerCase() === 'score' || key.toLowerCase() === 'f1'} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-body font-medium text-muted-foreground block">Warnings</span>
              {warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle size={13} className="text-warning mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-body text-warning">{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* ALS Insight */}
          {showAlsInsight && (
            <div className="p-4 rounded-md border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-display font-semibold text-foreground block mb-1">ALS Detection Insight</span>
                  <span className="text-xs font-body text-muted-foreground">
                    This model shows strong sensitivity — important for ALS detection use cases.
                    Recall ({(recallEntry![1] * 100).toFixed(1)}%) is the highest metric, indicating the model prioritises
                    detecting positive cases.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Run Configuration */}
          <div className="rounded-md border border-border bg-surface p-4">
            <span className="text-xs font-body font-medium text-muted-foreground block mb-3">Run Configuration</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {run?.run_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-body text-xs">Run ID</span>
                  <RunIdDisplay runId={run.run_id} />
                </div>
              )}
              {run?.timestamp_utc && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-body text-xs">Timestamp</span>
                  <span className="font-mono text-xs text-foreground">
                    {new Date(run.timestamp_utc).toLocaleString()}
                  </span>
                </div>
              )}
              {run?.model && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-body text-xs">Model</span>
                  <span className="font-mono text-xs text-foreground">{run.model}</span>
                </div>
              )}
              {run?.version && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-body text-xs">Version</span>
                  <span className="font-mono text-xs text-foreground">{run.version}</span>
                </div>
              )}
              {run?.status && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-body text-xs">Status</span>
                  <StatusBadge status={run.status} />
                </div>
              )}
              {run?.device && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-body text-xs">Device</span>
                  <span className="font-mono text-xs text-foreground">{run.device}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
