import json
from pathlib import Path

CLASSIFICATION_METRICS = [
    "accuracy",
    "precision",
    "recall",
    "sensitivity",
    "specificity",
    "f1",
    "f1_score",
    "auc",
    "auc_roc",
    "roc_auc",
]

REGRESSION_METRICS = [
    "mae",
    "mse",
    "rmse",
    "r2",
]

METRIC_ALIASES = {
    "f1_score": "f1",
    "f1score": "f1",
    "auc_roc": "auc",
    "roc_auc": "auc",
    "sensitivity": "recall",
}


def _is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def normalise_metrics(metrics: dict) -> dict:
    normalised = {}

    for key, value in metrics.items():
        key_lower = str(key).strip().lower()
        key_lower = METRIC_ALIASES.get(key_lower, key_lower)

        if _is_number(value):
            normalised[key_lower] = float(value)

    return normalised


def extract_metrics(data: dict) -> dict:
    """
    Support both:
    1) {"metrics": {...}}
    2) flat outputs like {"accuracy": 0.91, "recall": 0.92}
    """
    if not isinstance(data, dict):
        return {}

    if isinstance(data.get("metrics"), dict):
        return data["metrics"]

    extracted = {}
    for key, value in data.items():
        if _is_number(value):
            extracted[key] = value

    return extracted


def detect_task_type(metrics: dict) -> str:
    metric_keys = set(metrics.keys())

    if any(m in metric_keys for m in CLASSIFICATION_METRICS):
        return "classification"
    if any(m in metric_keys for m in REGRESSION_METRICS):
        return "regression"
    return "custom"


def validate_metrics(metrics: dict, task_type: str) -> list[str]:
    warnings = []

    if task_type == "classification":
        preferred = ["accuracy", "precision", "recall", "f1"]
    elif task_type == "regression":
        preferred = ["mae", "mse"]
    else:
        return ["Unknown task type - limited evaluation available"]

    for metric in preferred:
        if metric not in metrics:
            warnings.append(f"Missing metric: {metric}")

    return warnings


def compute_score(metrics: dict, task_type: str, als_mode: bool = False) -> float:
    if task_type == "classification":
        accuracy = metrics.get("accuracy", 0.0)
        precision = metrics.get("precision", 0.0)
        recall = metrics.get("recall", 0.0)
        f1 = metrics.get("f1", 0.0)
        auc = metrics.get("auc", 0.0)
        specificity = metrics.get("specificity", 0.0)

        if als_mode:
            score = (
                0.35 * recall +
                0.25 * f1 +
                0.15 * accuracy +
                0.10 * precision +
                0.10 * auc +
                0.05 * specificity
            )
        else:
            score = (
                0.25 * accuracy +
                0.25 * f1 +
                0.20 * recall +
                0.15 * precision +
                0.10 * auc +
                0.05 * specificity
            )

        return round(score, 4)

    if task_type == "regression":
        mae = metrics.get("mae", 0.0)
        mse = metrics.get("mse", 0.0)
        rmse = metrics.get("rmse", 0.0)
        r2 = metrics.get("r2", 0.0)

        penalty = (0.35 * mae) + (0.35 * mse) + (0.20 * rmse)
        score = r2 - penalty
        return round(score, 4)

    return 0.0


def compare_runs(run_a: dict, run_b: dict) -> dict:
    metrics_a = run_a.get("metrics", {})
    metrics_b = run_b.get("metrics", {})

    comparison = {}

    shared_metrics = sorted(set(metrics_a.keys()) & set(metrics_b.keys()))
    for key in shared_metrics:
        comparison[key] = round(metrics_a[key] - metrics_b[key], 4)

    return comparison


def generate_insights(run_a: dict, run_b: dict, als_mode: bool = False) -> list[str]:
    insights = []

    metrics_a = run_a.get("metrics", {})
    metrics_b = run_b.get("metrics", {})

    if not metrics_a or not metrics_b:
        return ["Insufficient metrics available for comparison."]

    if "accuracy" in metrics_a and "accuracy" in metrics_b:
        if metrics_a["accuracy"] > metrics_b["accuracy"]:
            insights.append("Model A achieves higher accuracy.")
        elif metrics_b["accuracy"] > metrics_a["accuracy"]:
            insights.append("Model B achieves higher accuracy.")

    if "recall" in metrics_a and "recall" in metrics_b:
        if metrics_a["recall"] > metrics_b["recall"]:
            insights.append("Model A has higher recall, indicating stronger positive-case detection.")
        elif metrics_b["recall"] > metrics_a["recall"]:
            insights.append("Model B has higher recall, indicating stronger positive-case detection.")

    if "precision" in metrics_a and "precision" in metrics_b:
        if metrics_a["precision"] > metrics_b["precision"]:
            insights.append("Model A has higher precision, indicating fewer false positives.")
        elif metrics_b["precision"] > metrics_a["precision"]:
            insights.append("Model B has higher precision, indicating fewer false positives.")

    if "f1" in metrics_a and "f1" in metrics_b:
        if metrics_a["f1"] > metrics_b["f1"]:
            insights.append("Model A has the better F1-score balance between precision and recall.")
        elif metrics_b["f1"] > metrics_a["f1"]:
            insights.append("Model B has the better F1-score balance between precision and recall.")

    if als_mode and "recall" in metrics_a and "recall" in metrics_b:
        if metrics_a["recall"] > metrics_b["recall"]:
            insights.append("For ALS-focused use, Model A may be preferable due to higher sensitivity.")
        elif metrics_b["recall"] > metrics_a["recall"]:
            insights.append("For ALS-focused use, Model B may be preferable due to higher sensitivity.")

    if not insights:
        insights.append("No major differences could be inferred from the shared metrics.")

    return insights


def evaluate_run(output_json_path: str, als_mode: bool = False) -> dict:
    path = Path(output_json_path)

    if not path.exists():
        return {
            "task_type": "unknown",
            "metrics": {},
            "score": 0.0,
            "warnings": ["output.json not found"],
        }

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {
            "task_type": "invalid",
            "metrics": {},
            "score": 0.0,
            "warnings": ["output.json is invalid or corrupted"],
        }

    raw_metrics = extract_metrics(data)
    metrics = normalise_metrics(raw_metrics)

    task_type = data.get("task_type") or detect_task_type(metrics)

    if not metrics:
        return {
            "task_type": task_type,
            "metrics": {},
            "score": 0.0,
            "warnings": ["No valid metrics found in output.json"],
        }

    warnings = validate_metrics(metrics, task_type)
    score = compute_score(metrics, task_type, als_mode)

    return {
        "task_type": task_type,
        "metrics": metrics,
        "score": score,
        "warnings": warnings,
    }


def compare_multiple_runs(run_paths: list[str], als_mode: bool = False) -> list[dict]:
    evaluated = []

    for path in run_paths:
        result = evaluate_run(path, als_mode=als_mode)
        result["source_path"] = path
        evaluated.append(result)

    ranked = sorted(evaluated, key=lambda x: x["score"] or 0.0, reverse=True)
    return ranked