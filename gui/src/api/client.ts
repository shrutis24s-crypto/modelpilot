import { BASE_URL, ENDPOINTS } from './config';

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Models
export const getModels = () =>
  request('GET', ENDPOINTS.models).then(r => r.models ?? r);

// Build
export const buildModel = (model: string, template?: string, rebuild?: boolean) =>
  request('POST', ENDPOINTS.build, { model, template, rebuild });

// Run
export const runModel = (model: string, use_gpu: boolean, timeout: number, input_path?: string) =>
  request('POST', ENDPOINTS.run, { model, use_gpu, timeout, input_path });
export const listRuns = () =>
  request('GET', ENDPOINTS.runs).then(r => r.runs ?? r);
export const getRun = (run_id: string) => request('GET', ENDPOINTS.runDetail(run_id));
export const getRunLogs = (run_id: string) => request('GET', ENDPOINTS.runLogs(run_id));
export const getRunOutput = (run_id: string) => request('GET', ENDPOINTS.runOutput(run_id));
export const getRelatedRuns = (run_id: string) =>
  request('GET', ENDPOINTS.runRelated(run_id)).then(r => r.related_runs ?? r);

// Reports
export const getReport = (run_id: string) => request('GET', ENDPOINTS.report(run_id));
export const getVisualReport = (run_id: string) => request('POST', ENDPOINTS.reportVisual(run_id));

// Compare — normalize backend shapes into { runs, comparison, insights }

function normalizeTwoRunComparison(r: any) {
  const m1 = r.metrics_run_1 ?? {};
  const m2 = r.metrics_run_2 ?? {};
  const diffs = r.differences ?? {};
  const metricKeys = Object.keys(m1);

  // Only average metrics that are performance metrics (0-1 range)
  // Exclude loss/error metrics which are lower-is-better
  const EXCLUDE = ['loss', 'mse', 'mae', 'rmse', 'error'];
  const scoreMetrics = (obj: Record<string, number>) =>
    Object.entries(obj)
      .filter(([k, v]) => !EXCLUDE.includes(k.toLowerCase()) && typeof v === 'number' && v >= 0 && v <= 1)
      .map(([, v]) => v);

  const avg = (obj: Record<string, number>) => {
    const vals = scoreMetrics(obj);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  return {
    runs: [
      { run_id: r.run_id_1, score: r.score_1 ?? avg(m1), metrics: m1 },
      { run_id: r.run_id_2, score: r.score_2 ?? avg(m2), metrics: m2 },
    ],
    comparison: metricKeys.map(k => ({
      metric: k,
      [r.run_id_1]: m1[k],
      [r.run_id_2]: m2[k],
      values: [m1[k], m2[k]],
      diff: diffs[k] ?? (m1[k] - m2[k]),
    })),
    insights: r.insights ?? [],
  };
}

function normalizeRankingComparison(r: any) {
  const ranking = r.ranking ?? [];
  const sharedMetrics: string[] = r.shared_metrics ?? [];
  return {
    runs: ranking.map((entry: any) => ({
      run_id: entry.run_id,
      model: entry.model,
      score: entry.score,
    })),
    comparison: sharedMetrics.map(metric => {
      const entry: any = { metric };
      ranking.forEach((run: any, i: number) => {
        entry[run.run_id] = run.metrics?.[metric] ?? 0;
        if (!entry.values) entry.values = [];
        entry.values[i] = run.metrics?.[metric] ?? 0;
      });
      if (ranking.length === 2) {
        entry.diff = (ranking[0].metrics?.[metric] ?? 0) - (ranking[1].metrics?.[metric] ?? 0);
      }
      return entry;
    }),
    insights: r.insights_first_two_runs ?? r.insights ?? [],
  };
}

export const compareRuns = (run_ids: string[]) =>
  request('POST', ENDPOINTS.compare, { run_ids }).then(normalizeRankingComparison);
export const compareTwoRuns = (run_id_1: string, run_id_2: string) =>
  request('POST', ENDPOINTS.compareTwo, { run_id_1, run_id_2 }).then(normalizeTwoRunComparison);
export const compareSameModel = (run_id: string) =>
  request('POST', ENDPOINTS.compareSameModel(run_id)).then(normalizeRankingComparison);

// Templates
export const getTemplates = () =>
  request('GET', ENDPOINTS.templates).then(r => r.templates ?? r);
export const getTemplate = (name: string) => request('GET', ENDPOINTS.templateDetail(name));
export const getSelectedTemplate = () =>
  request('GET', ENDPOINTS.templateSelected).then(r => r.selected_template ?? r);
export const selectTemplate = (name: string) => request('POST', ENDPOINTS.templateSelect, { name });
export const clearTemplate = () => request('DELETE', ENDPOINTS.templateSelected);
