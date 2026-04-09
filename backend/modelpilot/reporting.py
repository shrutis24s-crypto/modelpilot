import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import matplotlib.pyplot as plt

from .config import RUNS_METADATA_DIR, RUNS_OUTPUTS_DIR, RUNS_REPORTS_DIR, ensure_dirs
from .evaluator import evaluate_run, generate_insights


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _safe_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_run_metadata(run_id: str) -> dict:
    meta_path = RUNS_METADATA_DIR / f"{run_id}.json"
    if not meta_path.exists():
        raise FileNotFoundError(f"Run metadata not found for {run_id}")
    return _load_json(meta_path)


def list_all_run_metadata() -> List[dict]:
    ensure_dirs()
    runs = []

    for meta_file in sorted(RUNS_METADATA_DIR.glob("run_*.json")):
        try:
            runs.append(_load_json(meta_file))
        except Exception:
            continue

    return runs


def get_runs_for_model(model_name: str) -> List[dict]:
    return [
        run for run in list_all_run_metadata()
        if run.get("model") == model_name
    ]


def get_related_runs(run_id: str) -> List[dict]:
    current = get_run_metadata(run_id)
    model_name = current.get("model")

    related = [
        run for run in get_runs_for_model(model_name)
        if run.get("run_id") != run_id
    ]

    related.sort(key=lambda x: x.get("timestamp_utc", ""), reverse=True)
    return related


def _load_evaluated_run(run_id: str, als_mode: bool = True) -> dict:
    meta = get_run_metadata(run_id)
    output_json = RUNS_OUTPUTS_DIR / run_id / "output.json"

    evaluation = evaluate_run(str(output_json), als_mode=als_mode)

    return {
        "run_id": run_id,
        "model": meta.get("model"),
        "version": meta.get("version"),
        "status": meta.get("status"),
        "duration_seconds": meta.get("duration_seconds"),
        "hardware_device": meta.get("hardware_device"),
        "metadata": meta,
        "evaluation": evaluation,
    }


def _save_single_run_plot(metrics: dict, save_path: Path) -> None:
    names = list(metrics.keys())
    values = list(metrics.values())

    plt.figure(figsize=(10, 5))
    plt.bar(names, values)
    plt.title("Performance Metrics")
    plt.xlabel("Metric")
    plt.ylabel("Value")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    save_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(save_path, dpi=150)
    plt.close()


def _save_comparison_plot(run_results: List[dict], shared_metrics: List[str], save_path: Path) -> None:
    if not run_results or not shared_metrics:
        return

    x = list(range(len(shared_metrics)))
    width = 0.8 / max(len(run_results), 1)

    plt.figure(figsize=(12, 6))

    for idx, run in enumerate(run_results):
        metric_values = [run["evaluation"]["metrics"].get(m, 0.0) for m in shared_metrics]
        positions = [i + idx * width for i in x]
        plt.bar(positions, metric_values, width=width, label=run["run_id"])

    tick_positions = [i + (width * (len(run_results) - 1) / 2) for i in x]
    plt.xticks(tick_positions, shared_metrics, rotation=45, ha="right")
    plt.title("Run Comparison")
    plt.xlabel("Metric")
    plt.ylabel("Value")
    plt.legend()
    plt.tight_layout()
    save_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(save_path, dpi=150)
    plt.close()


def generate_run_report(run_id: str, als_mode: bool = True) -> dict:
    ensure_dirs()

    run_data = _load_evaluated_run(run_id, als_mode=als_mode)
    meta = run_data["metadata"]
    evaluation = run_data["evaluation"]

    report_dir = RUNS_REPORTS_DIR / run_id
    report_json_path = report_dir / "report.json"
    metrics_png_path = report_dir / "metrics.png"

    if evaluation["metrics"]:
        _save_single_run_plot(evaluation["metrics"], metrics_png_path)

    report = {
        "report_type": "single_run",
        "generated_at_utc": _safe_now_utc(),
        "run_id": run_id,
        "model": meta.get("model"),
        "version": meta.get("version"),
        "status": meta.get("status"),
        "duration_seconds": meta.get("duration_seconds"),
        "hardware_device": meta.get("hardware_device"),
        "task_type": evaluation.get("task_type"),
        "score": evaluation.get("score"),
        "metrics": evaluation.get("metrics", {}),
        "warnings": evaluation.get("warnings", []),
        "report_files": {
            "json": str(report_json_path),
            "plot": str(metrics_png_path) if evaluation["metrics"] else None,
        },
    }

    _write_json(report_json_path, report)
    return report


def generate_comparison_report(run_ids: List[str], als_mode: bool = True) -> dict:
    ensure_dirs()

    all_results = [_load_evaluated_run(run_id, als_mode=als_mode) for run_id in run_ids]

    # Filter out runs with no metrics
    run_results = [r for r in all_results if r["evaluation"]["metrics"]]

    if len(run_results) < 2:
        raise ValueError(
            "At least two runs with valid metrics are required for comparison. "
            "Some selected runs may not have produced output.json or recognised metrics."
        )

    all_metric_sets = [
        set(r["evaluation"]["metrics"].keys()) 
        for r in run_results 
        if r["evaluation"]["metrics"]
    ]

    shared_metrics = sorted(
        set.intersection(*all_metric_sets)
    ) if len(all_metric_sets) >= 2 else []

    insights = []
    pairwise_differences = {}

    if len(run_results) >= 2:
        run_a = run_results[0]["evaluation"]
        run_b = run_results[1]["evaluation"]

        insights = generate_insights(run_a, run_b, als_mode=als_mode)

        for metric in shared_metrics:
            pairwise_differences[metric] = round(
                run_a["metrics"][metric] - run_b["metrics"][metric], 4
            )

    comparison_name = "__".join(run_ids)
    comparison_dir = RUNS_REPORTS_DIR / "comparisons" / comparison_name
    comparison_json_path = comparison_dir / "comparison.json"
    comparison_png_path = comparison_dir / "comparison.png"

    if shared_metrics:
        _save_comparison_plot(run_results, shared_metrics, comparison_png_path)

    ranking = sorted(
        [
            {
                "run_id": r["run_id"],
                "model": r["model"],
                "version": r["version"],
                "score": r["evaluation"]["score"],
                "task_type": r["evaluation"]["task_type"],
                "metrics": r["evaluation"]["metrics"],
            }
            for r in run_results
        ],
        key=lambda x: x["score"] or 0.0,
        reverse=True
    )

    report = {
        "report_type": "comparison",
        "generated_at_utc": _safe_now_utc(),
        "run_ids": run_ids,
        "shared_metrics": shared_metrics,
        "pairwise_differences_first_two_runs": pairwise_differences,
        "insights_first_two_runs": insights,
        "ranking": ranking,
        "report_files": {
            "json": str(comparison_json_path),
            "plot": str(comparison_png_path) if shared_metrics else None,
        },
    }

    _write_json(comparison_json_path, report)
    return report


def generate_same_model_comparison(run_id: str, als_mode: bool = True, max_runs: int = 5) -> dict:
    related = get_related_runs(run_id)
    selected = [run_id] + [r["run_id"] for r in related[:max_runs - 1]]

    if len(selected) < 2:
        raise ValueError("No previous runs of the same model were found.")

    return generate_comparison_report(selected, als_mode=als_mode)