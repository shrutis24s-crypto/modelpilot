/**
 * Shared utilities for run numbering and version grouping.
 */

/** Assign sequential run numbers sorted by timestamp ascending (oldest = Run 1). */
export function assignRunNumbers(runs: any[]) {
  const sorted = [...runs].sort((a, b) => {
    const tA = a.timestamp_utc ?? a.started_at ?? a.date ?? a.timestamp ?? '';
    const tB = b.timestamp_utc ?? b.started_at ?? b.date ?? b.timestamp ?? '';
    return new Date(tA).getTime() - new Date(tB).getTime();
  });
  const numbered = sorted.map((run, index) => ({
    ...run,
    runNumber: index + 1,
    displayLabel: `Run ${index + 1} — ${run.model ?? run.model_name ?? 'Unknown'}`,
  }));
  // Return descending (newest first) for display
  return numbered.sort((a, b) => {
    const tA = a.timestamp_utc ?? a.started_at ?? a.date ?? a.timestamp ?? '';
    const tB = b.timestamp_utc ?? b.started_at ?? b.date ?? b.timestamp ?? '';
    return new Date(tB).getTime() - new Date(tA).getTime();
  });
}

/** Get a run number map: run_id -> runNumber */
export function getRunNumberMap(runs: any[]): Map<string, number> {
  const numbered = assignRunNumbers(runs);
  const map = new Map<string, number>();
  numbered.forEach(r => map.set(r.run_id, r.runNumber));
  return map;
}

/** Deterministic color from a version string (first 6 chars as hex). */
export function versionColor(version: string | undefined): string | null {
  if (!version || version.length < 3) return null;
  // Take first 6 hex-safe chars, pad if needed
  const hex = version.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).padEnd(6, 'a');
  return `#${hex}`;
}

/** Find the earliest run number sharing the same version. */
export function findFirstRunWithVersion(
  numberedRuns: any[],
  currentRunId: string,
  version: string | undefined
): number | null {
  if (!version) return null;
  const match = numberedRuns.find(
    (r: any) => r.version === version && r.run_id !== currentRunId
  );
  return match?.runNumber ?? null;
}
