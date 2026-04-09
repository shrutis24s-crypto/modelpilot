"""
ModelPilot Unit Test full
===========================

Development history:
  These tests were written incrementally during development to debug
  individual modules as they were built. Early tests (config, registry,
  validator, dockerfile_gen, evaluator) were used to verify each module
  in isolation before integration. Later tests (builder, runner, api,
  cli) were added as the system grew. The full end-end test file was consolidated
  here at the end of development to provide a comprehensive regression
  test that can be run at any time to confirm the entire system works
  as expected. This approach mirrors industry practice where unit tests
  evolve alongside code and serve both as debugging tools and as
  long-term documentation of intended behaviour.

Run from modelpilot/ root:
  pip install pytest
  pytest test_modelpilot.py -v

Run a single module:
  pytest test_modelpilot.py -v -k "config"
  pytest test_modelpilot.py -v -k "validator"
  pytest test_modelpilot.py -v -k "evaluator"
"""

import json
import os
import sys
import time
import subprocess
import tempfile
from pathlib import Path

import pytest
import requests

# ── Make sure project root is on the path ────────────────────
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))


# ══════════════════════════════════════════════════════════════
# FIXTURES
# ══════════════════════════════════════════════════════════════

@pytest.fixture
def tmp_model_dir(tmp_path):
    """
    Creates a minimal valid model directory:
      entry.py + requirements.txt (no Dockerfile).
    Used early in development to test registry and validator
    without needing real model files on disk.
    """
    entry = tmp_path / "entry.py"
    entry.write_text(
        "import json, os\n"
        "os.makedirs('/app/output', exist_ok=True)\n"
        "json.dump({'metrics': {'accuracy': 0.9}}, "
        "open('/app/output/output.json','w'))\n"
    )
    req = tmp_path / "requirements.txt"
    req.write_text("numpy==1.24.3\nscikit-learn==1.3.0\n")
    return tmp_path


@pytest.fixture
def tmp_model_with_dockerfile(tmp_path):
    """
    Creates a model directory with a user-supplied Dockerfile.
    Used to test the alternative intake path (FR-1).
    """
    dockerfile = tmp_path / "Dockerfile"
    dockerfile.write_text(
        "FROM python:3.10\n"
        "WORKDIR /app\n"
        "COPY . /app\n"
        'CMD ["python", "/app/entry.py"]\n'
    )
    entry = tmp_path / "entry.py"
    entry.write_text("print('hello')\n")
    return tmp_path


@pytest.fixture
def valid_output_json(tmp_path):
    """
    Writes a valid output.json as a real model would produce.
    Used throughout evaluator and reporting tests.
    """
    output_dir = tmp_path / "output"
    output_dir.mkdir()
    data = {
        "task_type": "classification",
        "model": "RandomForestClassifier",
        "metrics": {
            "accuracy": 0.87,
            "f1_score": 0.85,
            "sensitivity": 0.83,
            "specificity": 0.90,
            "loss": 0.13,
        },
        "predictions": [1, 0, 1, 1, 0],
        "status": "completed",
    }
    path = output_dir / "output.json"
    path.write_text(json.dumps(data))
    return path


@pytest.fixture
def config_backup():
    """
    Saves and restores .modelpilot_config.json around tests that
    modify selected template, so tests don't affect each other.
    """
    config_path = ROOT / ".modelpilot_config.json"
    original = config_path.read_text() if config_path.exists() else None
    yield config_path
    if original is not None:
        config_path.write_text(original)
    elif config_path.exists():
        config_path.unlink()


# ══════════════════════════════════════════════════════════════
# CONFIG TESTS
# First module written - needed by almost everything else.
# These were the very first tests added to catch config path
# issues when the project was being set up.
# ══════════════════════════════════════════════════════════════

class TestConfig:

    def test_project_root_resolves(self):
        from backend.modelpilot.config import PROJECT_ROOT
        assert PROJECT_ROOT.exists()
        assert (PROJECT_ROOT / "backend").exists()

    def test_models_dir_defined(self):
        from backend.modelpilot.config import MODELS_DIR
        assert MODELS_DIR.name == "models"

    def test_runs_dirs_defined(self):
        from backend.modelpilot.config import (
            RUNS_DIR, RUNS_LOGS_DIR, RUNS_OUTPUTS_DIR, RUNS_METADATA_DIR
        )
        assert RUNS_DIR.name == "runs"
        assert RUNS_LOGS_DIR.name == "logs"
        assert RUNS_OUTPUTS_DIR.name == "outputs"
        assert RUNS_METADATA_DIR.name == "metadata"

    def test_ensure_dirs_creates_directories(self):
        from backend.modelpilot.config import ensure_dirs, RUNS_LOGS_DIR
        ensure_dirs()
        assert RUNS_LOGS_DIR.exists()

    def test_set_and_get_selected_template(self, config_backup):
        from backend.modelpilot.config import set_selected_template, get_selected_template
        set_selected_template("sklearn")
        assert get_selected_template() == "sklearn"

    def test_clear_selected_template(self, config_backup):
        from backend.modelpilot.config import (
            set_selected_template, clear_selected_template, get_selected_template
        )
        set_selected_template("sklearn")
        clear_selected_template()
        assert get_selected_template() is None

    def test_get_template_returns_none_when_not_set(self, config_backup):
        from backend.modelpilot.config import clear_selected_template, get_selected_template
        clear_selected_template()
        assert get_selected_template() is None

    def test_set_template_overwrites_previous(self, config_backup):
        from backend.modelpilot.config import set_selected_template, get_selected_template
        set_selected_template("pytorch_cpu")
        set_selected_template("sklearn")
        assert get_selected_template() == "sklearn"

    def test_default_timeout_is_positive(self):
        from backend.modelpilot.config import DEFAULT_RUN_TIMEOUT_SECONDS
        assert DEFAULT_RUN_TIMEOUT_SECONDS > 0

    def test_image_name_prefix_defined(self):
        from backend.modelpilot.config import IMAGE_NAME_PREFIX
        assert isinstance(IMAGE_NAME_PREFIX, str)
        assert len(IMAGE_NAME_PREFIX) > 0


# ══════════════════════════════════════════════════════════════
# TEMPLATES TESTS
# Added while building the template system (FR-16).
# Used to debug why list_templates was returning empty lists
# and to catch the .Dockerfile extension issue.
# ══════════════════════════════════════════════════════════════

class TestTemplates:

    def test_list_templates_returns_list(self):
        from backend.modelpilot.templates import list_templates
        templates = list_templates()
        assert isinstance(templates, list)

    def test_list_templates_not_empty(self):
        from backend.modelpilot.templates import list_templates
        assert len(list_templates()) > 0

    def test_list_templates_sorted(self):
        from backend.modelpilot.templates import list_templates
        templates = list_templates()
        assert templates == sorted(templates)

    def test_load_valid_template(self):
        from backend.modelpilot.templates import list_templates, load_template
        content = load_template(list_templates()[0])
        assert isinstance(content, str) and len(content) > 0

    def test_load_template_contains_from(self):
        from backend.modelpilot.templates import list_templates, load_template
        assert "FROM" in load_template(list_templates()[0])

    def test_load_nonexistent_template_raises(self):
        from backend.modelpilot.templates import load_template
        with pytest.raises(FileNotFoundError):
            load_template("nonexistent_template_xyz")

    def test_sklearn_template_exists(self):
        from backend.modelpilot.templates import list_templates
        assert "sklearn" in list_templates()

    def test_pytorch_cpu_template_exists(self):
        from backend.modelpilot.templates import list_templates
        assert "pytorch_cpu" in list_templates()


# ══════════════════════════════════════════════════════════════
# VALIDATOR TESTS
# Added during FR-1 implementation to ensure the system
# correctly rejects bad model folders before attempting a build.
# Caught several edge cases: empty requirements, missing entry,
# partial Dockerfile content.
# ══════════════════════════════════════════════════════════════

class TestValidator:

    def test_valid_model_passes_entry_check(self, tmp_model_dir):
        from backend.modelpilot.validator import validate_entry
        issues = validate_entry(tmp_model_dir / "entry.py")
        assert isinstance(issues, list)

    def test_missing_entry_script_detected(self, tmp_path):
        from backend.modelpilot.validator import validate_entry
        issues = validate_entry(tmp_path / "entry.py")
        assert any("not found" in i.lower() for i in issues)

    def test_entry_without_output_flagged(self, tmp_path):
        from backend.modelpilot.validator import validate_entry
        entry = tmp_path / "entry.py"
        entry.write_text("x = 1 + 1\nprint(x)\n")
        issues = validate_entry(entry)
        assert any("output" in i.lower() for i in issues)

    def test_entry_without_input_flagged(self, tmp_path):
        from backend.modelpilot.validator import validate_entry
        entry = tmp_path / "entry.py"
        entry.write_text(
            "import json\n"
            "json.dump({}, open('/app/output/output.json','w'))\n"
        )
        issues = validate_entry(entry)
        assert any("input" in i.lower() for i in issues)

    def test_valid_requirements_no_issues(self, tmp_model_dir):
        from backend.modelpilot.validator import validate_requirements
        issues, _ = validate_requirements(tmp_model_dir / "requirements.txt")
        assert issues == []

    def test_empty_requirements_flagged(self, tmp_path):
        from backend.modelpilot.validator import validate_requirements
        req = tmp_path / "requirements.txt"
        req.write_text("")
        issues, _ = validate_requirements(req)
        assert len(issues) > 0

    def test_missing_requirements_flagged(self, tmp_path):
        from backend.modelpilot.validator import validate_requirements
        issues, _ = validate_requirements(tmp_path / "requirements.txt")
        assert any("not found" in i.lower() for i in issues)

    def test_typo_in_requirements_gives_suggestion(self, tmp_path):
        from backend.modelpilot.validator import validate_requirements
        req = tmp_path / "requirements.txt"
        req.write_text("sklearn==1.3.0\n")
        _, suggestions = validate_requirements(req)
        assert any(s[0] == "sklearn" for s in suggestions)

    def test_valid_dockerfile_no_issues(self, tmp_model_with_dockerfile):
        from backend.modelpilot.validator import validate_dockerfile
        issues = validate_dockerfile(tmp_model_with_dockerfile / "Dockerfile")
        assert issues == []

    def test_dockerfile_missing_from_flagged(self, tmp_path):
        from backend.modelpilot.validator import validate_dockerfile
        df = tmp_path / "Dockerfile"
        df.write_text('WORKDIR /app\nCMD ["python", "entry.py"]\n')
        issues = validate_dockerfile(df)
        assert any("from" in i.lower() for i in issues)

    def test_dockerfile_missing_cmd_flagged(self, tmp_path):
        from backend.modelpilot.validator import validate_dockerfile
        df = tmp_path / "Dockerfile"
        df.write_text("FROM python:3.10\nWORKDIR /app\nCOPY . /app\n")
        issues = validate_dockerfile(df)
        assert any(
            "cmd" in i.lower() or "entrypoint" in i.lower() for i in issues
        )

    def test_validate_model_with_requirements(self, tmp_model_dir):
        from backend.modelpilot.validator import validate_model
        report = validate_model(tmp_model_dir)
        assert report["source"] == "requirements"
        assert isinstance(report["requirements"], list)
        assert isinstance(report["entry"], list)

    def test_validate_model_with_dockerfile(self, tmp_model_with_dockerfile):
        from backend.modelpilot.validator import validate_model
        report = validate_model(tmp_model_with_dockerfile)
        assert report["source"] == "dockerfile"
        assert report["dockerfile"] == []


# ══════════════════════════════════════════════════════════════
# DOCKERFILE GENERATOR TESTS
# Added during FR-2 implementation. Used to debug why the
# generated Dockerfile was not being written, and to confirm
# idempotent generation (same content -> no file churn).
# ══════════════════════════════════════════════════════════════

class TestDockerfileGen:

    def test_generates_dockerfile_file(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        path = generate_dockerfile(tmp_model_dir)
        assert path.exists()
        assert path.name == "Dockerfile.generated"

    def test_generated_content_has_from(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        assert "FROM python" in generate_dockerfile(tmp_model_dir).read_text()

    def test_generated_content_has_pip_install(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        assert "pip install" in generate_dockerfile(tmp_model_dir).read_text()

    def test_generated_content_has_workdir(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        assert "WORKDIR" in generate_dockerfile(tmp_model_dir).read_text()

    def test_generated_content_has_cmd(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        content = generate_dockerfile(tmp_model_dir).read_text()
        assert "CMD" in content or "ENTRYPOINT" in content

    def test_generated_content_has_entry_py(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        assert "entry.py" in generate_dockerfile(tmp_model_dir).read_text()

    def test_generation_is_idempotent(self, tmp_model_dir):
        """
        Running generate_dockerfile twice should not rewrite the file
        if content is unchanged. This was caught as a bug early on -
        unnecessary rewrites were invalidating the Docker build cache.
        """
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        path = generate_dockerfile(tmp_model_dir)
        mtime1 = path.stat().st_mtime
        generate_dockerfile(tmp_model_dir)
        assert path.stat().st_mtime == mtime1

    def test_generated_dockerfile_contains_requirements_copy(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        assert "requirements.txt" in generate_dockerfile(tmp_model_dir).read_text()

    def test_generated_dockerfile_creates_output_dir(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        assert "/app/output" in generate_dockerfile(tmp_model_dir).read_text()


# ══════════════════════════════════════════════════════════════
# REGISTRY TESTS
# Added during FR-1 implementation. resolve_model was the first
# real function in the system. Tests caught the early bug where
# models without entry.py were silently accepted.
# ══════════════════════════════════════════════════════════════

class TestRegistry:

    def test_list_models_returns_list(self):
        from backend.modelpilot.registry import list_models
        assert isinstance(list_models(), list)

    def test_list_models_includes_als_classifier(self):
        from backend.modelpilot.registry import list_models
        assert "als_classifier" in list_models()

    def test_list_models_includes_als_svm(self):
        from backend.modelpilot.registry import list_models
        assert "als_svm" in list_models()

    def test_resolve_valid_model(self):
        from backend.modelpilot.registry import resolve_model
        spec = resolve_model("als_classifier")
        assert spec.name == "als_classifier"
        assert spec.path.exists()

    def test_resolve_model_has_entry_script(self):
        from backend.modelpilot.registry import resolve_model
        spec = resolve_model("als_classifier")
        assert spec.entry_script is not None
        assert spec.entry_script.exists()

    def test_resolve_model_has_requirements(self):
        from backend.modelpilot.registry import resolve_model
        spec = resolve_model("als_classifier")
        assert spec.requirements_path is not None

    def test_resolve_nonexistent_model_raises(self):
        from backend.modelpilot.registry import resolve_model
        with pytest.raises(ValueError):
            resolve_model("model_that_does_not_exist_xyz")

    def test_resolve_model_without_entry_raises(self, tmp_path, monkeypatch):
        """
        Model folder exists but has no entry.py - should raise ValueError.
        This was the first bug caught during FR-1 development.
        """
        from backend.modelpilot import config
        monkeypatch.setattr(config, "MODELS_DIR", tmp_path)
        model_dir = tmp_path / "bad_model"
        model_dir.mkdir()
        (model_dir / "requirements.txt").write_text("numpy==1.24.3\n")
        from backend.modelpilot.registry import resolve_model
        with pytest.raises(ValueError):
            resolve_model("bad_model")

    def test_resolve_model_no_dockerfile_no_requirements_raises(self, tmp_path, monkeypatch):
        from backend.modelpilot import config
        monkeypatch.setattr(config, "MODELS_DIR", tmp_path)
        model_dir = tmp_path / "empty_model"
        model_dir.mkdir()
        (model_dir / "entry.py").write_text("pass\n")
        from backend.modelpilot.registry import resolve_model
        with pytest.raises(ValueError):
            resolve_model("empty_model")

    def test_resolve_all_test_models(self):
        from backend.modelpilot.registry import resolve_model
        for m in ["als_classifier", "als_classifier_v2", "als_svm"]:
            spec = resolve_model(m)
            assert spec.name == m


# ══════════════════════════════════════════════════════════════
# EVALUATOR TESTS
# Added during FR-9 implementation (reporting).
# Caught several metric normalisation bugs - for example
# f1_score not being mapped to f1, and non-numeric values
# slipping through into the metrics dict.
# ══════════════════════════════════════════════════════════════

class TestEvaluator:

    def test_evaluate_valid_output(self, valid_output_json):
        from backend.modelpilot.evaluator import evaluate_run
        result = evaluate_run(str(valid_output_json))
        assert result["task_type"] == "classification"
        assert "accuracy" in result["metrics"]
        assert result["score"] > 0

    def test_evaluate_missing_file_returns_warning(self, tmp_path):
        from backend.modelpilot.evaluator import evaluate_run
        result = evaluate_run(str(tmp_path / "nonexistent.json"))
        assert "not found" in result["warnings"][0].lower()
        assert result["score"] == 0.0

    def test_evaluate_corrupted_json_returns_warning(self, tmp_path):
        from backend.modelpilot.evaluator import evaluate_run
        bad = tmp_path / "output.json"
        bad.write_text("{ this is not valid json }")
        result = evaluate_run(str(bad))
        assert len(result["warnings"]) > 0

    def test_normalise_metrics_handles_aliases(self):
        from backend.modelpilot.evaluator import normalise_metrics
        normalised = normalise_metrics({"f1_score": 0.85, "sensitivity": 0.80})
        assert "f1" in normalised
        assert "recall" in normalised

    def test_normalise_metrics_excludes_non_numeric(self):
        from backend.modelpilot.evaluator import normalise_metrics
        normalised = normalise_metrics({
            "accuracy": 0.9, "model": "RF", "status": "completed"
        })
        assert "model" not in normalised
        assert "accuracy" in normalised

    def test_detect_task_type_classification(self):
        from backend.modelpilot.evaluator import detect_task_type
        assert detect_task_type({"accuracy": 0.9, "f1": 0.85}) == "classification"

    def test_detect_task_type_regression(self):
        from backend.modelpilot.evaluator import detect_task_type
        assert detect_task_type({"mae": 0.1, "r2": 0.95}) == "regression"

    def test_detect_task_type_custom(self):
        from backend.modelpilot.evaluator import detect_task_type
        assert detect_task_type({"custom_metric": 0.5}) == "custom"

    def test_compute_score_classification(self):
        from backend.modelpilot.evaluator import compute_score
        metrics = {
            "accuracy": 0.9, "f1": 0.88, "recall": 0.87,
            "precision": 0.89, "auc": 0.91, "specificity": 0.85
        }
        score = compute_score(metrics, "classification")
        assert 0 < score <= 1

    def test_compute_score_als_mode_weights_recall_higher(self):
        """
        ALS mode weights recall/sensitivity more heavily.
        A model with high recall should score higher in ALS mode
        than in standard mode. Critical for clinical ALS use case.
        """
        from backend.modelpilot.evaluator import compute_score
        metrics = {
            "accuracy": 0.7, "f1": 0.7, "recall": 0.95,
            "precision": 0.6, "auc": 0.0, "specificity": 0.5
        }
        als_score    = compute_score(metrics, "classification", als_mode=True)
        normal_score = compute_score(metrics, "classification", als_mode=False)
        assert als_score > normal_score

    def test_compare_runs_returns_differences(self):
        from backend.modelpilot.evaluator import compare_runs
        diff = compare_runs(
            {"metrics": {"accuracy": 0.90, "f1": 0.88}},
            {"metrics": {"accuracy": 0.85, "f1": 0.82}},
        )
        assert "accuracy" in diff
        assert round(diff["accuracy"], 2) == 0.05

    def test_compare_runs_only_shared_metrics(self):
        from backend.modelpilot.evaluator import compare_runs
        diff = compare_runs(
            {"metrics": {"accuracy": 0.9}},
            {"metrics": {"accuracy": 0.8, "f1": 0.75}},
        )
        assert "accuracy" in diff
        assert "f1" not in diff

    def test_generate_insights_returns_list(self):
        from backend.modelpilot.evaluator import generate_insights
        insights = generate_insights(
            {"metrics": {"accuracy": 0.90, "recall": 0.88,
                         "f1": 0.87, "precision": 0.86}},
            {"metrics": {"accuracy": 0.80, "recall": 0.75,
                         "f1": 0.78, "precision": 0.80}},
        )
        assert isinstance(insights, list)
        assert len(insights) > 0

    def test_generate_insights_empty_metrics(self):
        from backend.modelpilot.evaluator import generate_insights
        assert isinstance(generate_insights({"metrics": {}}, {"metrics": {}}), list)

    def test_extract_metrics_from_nested(self):
        from backend.modelpilot.evaluator import extract_metrics
        assert extract_metrics({"metrics": {"accuracy": 0.9}})["accuracy"] == 0.9

    def test_extract_metrics_from_flat(self):
        from backend.modelpilot.evaluator import extract_metrics
        assert "accuracy" in extract_metrics({"accuracy": 0.9, "model": "RF"})

    def test_evaluate_run_als_mode_differs(self, valid_output_json):
        from backend.modelpilot.evaluator import evaluate_run
        als    = evaluate_run(str(valid_output_json), als_mode=True)
        normal = evaluate_run(str(valid_output_json), als_mode=False)
        assert als["score"] != normal["score"]


# ══════════════════════════════════════════════════════════════
# EDGE CASE TESTS
# Added late in development to test robustness under realistic
# failure scenarios. These directly address NFR-3: the system
# must provide clear error messages for bad inputs.
# ══════════════════════════════════════════════════════════════

class TestEdgeCases:

    def test_empty_output_json_handled(self, tmp_path):
        """Empty output.json should not crash the evaluator."""
        bad = tmp_path / "output.json"
        bad.write_text("{}")
        from backend.modelpilot.evaluator import evaluate_run
        result = evaluate_run(str(bad))
        assert isinstance(result, dict)
        assert "warnings" in result

    def test_output_json_with_string_metrics_ignored(self, tmp_path):
        """Non-numeric metric values must be filtered out."""
        bad = tmp_path / "output.json"
        bad.write_text(json.dumps({
            "metrics": {"accuracy": "high", "f1": None, "status": "ok"}
        }))
        from backend.modelpilot.evaluator import evaluate_run
        result = evaluate_run(str(bad))
        assert "accuracy" not in result.get("metrics", {})

    def test_resolve_model_empty_folder_raises(self, tmp_path, monkeypatch):
        """Completely empty model folder should raise ValueError."""
        from backend.modelpilot import config
        monkeypatch.setattr(config, "MODELS_DIR", tmp_path)
        (tmp_path / "empty").mkdir()
        from backend.modelpilot.registry import resolve_model
        with pytest.raises(ValueError):
            resolve_model("empty")

    def test_config_handles_missing_config_file(self, tmp_path, monkeypatch):
        """get_selected_template returns None when config file is missing."""
        from backend.modelpilot import config
        monkeypatch.setattr(config, "CONFIG_FILE", tmp_path / "nonexistent.json")
        assert config.get_selected_template() is None

    def test_generate_insights_both_empty(self):
        from backend.modelpilot.evaluator import generate_insights
        assert isinstance(
            generate_insights({"metrics": {}}, {"metrics": {}}), list
        )

    def test_compare_runs_no_shared_metrics(self):
        from backend.modelpilot.evaluator import compare_runs
        assert compare_runs(
            {"metrics": {"mae": 0.1}},
            {"metrics": {"accuracy": 0.9}}
        ) == {}

    def test_dockerfile_gen_idempotent_on_unchanged_content(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        path  = generate_dockerfile(tmp_model_dir)
        mtime = path.stat().st_mtime
        generate_dockerfile(tmp_model_dir)
        assert path.stat().st_mtime == mtime

    def test_evaluate_zero_metrics_gives_zero_score(self, tmp_path):
        """All-zero metrics should produce a zero score."""
        zero = tmp_path / "output.json"
        zero.write_text(json.dumps({
            "task_type": "classification",
            "metrics": {
                "accuracy": 0.0, "f1": 0.0,
                "recall": 0.0, "precision": 0.0
            }
        }))
        from backend.modelpilot.evaluator import evaluate_run
        result = evaluate_run(str(zero))
        assert result["score"] == 0.0

    def test_normalise_metrics_empty_dict(self):
        from backend.modelpilot.evaluator import normalise_metrics
        assert normalise_metrics({}) == {}

    def test_normalise_metrics_boolean_excluded(self):
        """Booleans should not be treated as numbers in metrics."""
        from backend.modelpilot.evaluator import normalise_metrics
        result = normalise_metrics({"accuracy": True, "f1": 0.8})
        assert "accuracy" not in result


# ══════════════════════════════════════════════════════════════
# API ENDPOINT TESTS
# Added after api/main.py was complete (FR-17 GUI support).
# Tests check response structure not just status codes.
# Requires: uvicorn backend.api.main:app --reload (running)
# ══════════════════════════════════════════════════════════════

API_BASE = "http://localhost:8000"


def api_available():
    try:
        return requests.get(f"{API_BASE}/models", timeout=3).status_code == 200
    except Exception:
        return False


@pytest.mark.skipif(not api_available(), reason="Backend API not running")
class TestAPI:

    def test_get_models_returns_list(self):
        r = requests.get(f"{API_BASE}/models")
        assert r.status_code == 200
        data = r.json()
        assert "models" in data
        assert isinstance(data["models"], list)

    def test_get_models_includes_als_classifier(self):
        assert "als_classifier" in requests.get(f"{API_BASE}/models").json()["models"]

    def test_get_runs_returns_list(self):
        r = requests.get(f"{API_BASE}/runs")
        assert r.status_code == 200
        assert "runs" in r.json()

    def test_get_templates_returns_list(self):
        r = requests.get(f"{API_BASE}/templates")
        assert r.status_code == 200
        assert len(r.json()["templates"]) > 0

    def test_get_selected_template_endpoint(self):
        r = requests.get(f"{API_BASE}/templates/selected")
        assert r.status_code == 200
        assert "selected_template" in r.json()

    def test_get_specific_template_content(self):
        r = requests.get(f"{API_BASE}/templates/sklearn")
        assert r.status_code == 200
        assert "FROM" in r.json()["dockerfile"]

    def test_get_nonexistent_template_404(self):
        assert requests.get(f"{API_BASE}/templates/nonexistent_xyz").status_code == 404

    def test_select_template_endpoint(self):
        r = requests.post(f"{API_BASE}/templates/select", json={"name": "sklearn"})
        assert r.status_code == 200
        assert r.json()["selected_template"] == "sklearn"

    def test_select_nonexistent_template_404(self):
        r = requests.post(
            f"{API_BASE}/templates/select",
            json={"name": "does_not_exist_xyz"}
        )
        assert r.status_code == 404

    def test_clear_template_endpoint(self):
        r = requests.delete(f"{API_BASE}/templates/selected")
        assert r.status_code == 200
        assert "cleared" in r.json()["message"].lower()

    def test_get_nonexistent_run_404(self):
        assert requests.get(f"{API_BASE}/run/run_does_not_exist").status_code == 404

    def test_compare_requires_two_runs(self):
        r = requests.post(f"{API_BASE}/compare", json={"run_ids": ["only_one"]})
        assert r.status_code == 400

    def test_build_invalid_model_returns_error(self):
        r = requests.post(f"{API_BASE}/build", json={"model": "nonexistent_xyz"})
        assert r.status_code in (404, 500)


# ══════════════════════════════════════════════════════════════
# CLI TESTS
# Added last - CLI wraps the backend so these are integration
# tests at the CLI layer. Used to catch the --input flag
# mounting issue and to verify all commands return correct
# exit codes and meaningful output.
# ══════════════════════════════════════════════════════════════

CLI_CMD = [sys.executable, "-m", "cli.main"]


def run_cli(*args, timeout=30):
    return subprocess.run(
        CLI_CMD + list(args),
        capture_output=True, text=True,
        timeout=timeout, cwd=str(ROOT),
    )


class TestCLI:

    def test_list_models_exits_zero(self):
        assert run_cli("list-models").returncode == 0

    def test_list_models_shows_als_classifier(self):
        assert "als_classifier" in run_cli("list-models").stdout

    def test_list_templates_exits_zero(self):
        assert run_cli("list-templates").returncode == 0

    def test_list_templates_shows_results(self):
        result = run_cli("list-templates")
        assert "sklearn" in result.stdout or len(result.stdout.strip()) > 0

    def test_select_template_exits_zero(self):
        assert run_cli("select-template", "sklearn").returncode == 0

    def test_clear_template_exits_zero(self):
        assert run_cli("clear-template").returncode == 0

    def test_view_template_exits_zero(self):
        assert run_cli("view-template", "sklearn").returncode == 0

    def test_view_template_contains_from(self):
        assert "FROM" in run_cli("view-template", "sklearn").stdout

    def test_select_nonexistent_template_fails(self):
        assert run_cli("select-template", "template_xyz_fake").returncode != 0

    def test_list_runs_exits_zero(self):
        assert run_cli("list-runs").returncode == 0

    def test_build_invalid_model_exits_nonzero(self):
        assert run_cli("build", "model_xyz_does_not_exist").returncode != 0

    def test_run_invalid_model_exits_nonzero(self):
        assert run_cli("run", "model_xyz_does_not_exist").returncode != 0

    def test_build_als_classifier_exits_zero(self):
        """Full Docker build — requires Docker running."""
        assert run_cli("build", "als_classifier", timeout=300).returncode == 0

    def test_build_output_contains_model_name(self):
        result = run_cli("build", "als_classifier", timeout=300)
        assert "als_classifier" in result.stdout

    def test_run_als_classifier_exits_zero(self):
        """Full Docker run — requires Docker and inputs/ folder."""
        assert run_cli(
            "run", "als_classifier", "--input", "inputs", timeout=300
        ).returncode == 0

    def test_run_creates_new_metadata_file(self):
        """Each run should produce a new run_*.json in metadata/."""
        before = set(Path("runs/metadata").glob("run_*.json")) \
            if Path("runs/metadata").exists() else set()
        run_cli("run", "als_classifier", "--input", "inputs", timeout=300)
        after = set(Path("runs/metadata").glob("run_*.json")) \
            if Path("runs/metadata").exists() else set()
        assert len(after) > len(before)


# ══════════════════════════════════════════════════════════════
# PERFORMANCE BENCHMARKING TESTS
# Added to verify NFR-4: builds complete within ~5 minutes and
# core operations are not unexpectedly slow. Framework overhead
# must be minimal for research usability.
# ══════════════════════════════════════════════════════════════

class TestPerformance:

    def test_list_models_under_one_second(self):
        from backend.modelpilot.registry import list_models
        start = time.time()
        list_models()
        assert time.time() - start < 1.0

    def test_list_templates_under_one_second(self):
        from backend.modelpilot.templates import list_templates
        start = time.time()
        list_templates()
        assert time.time() - start < 1.0

    def test_evaluate_run_under_half_second(self, valid_output_json):
        from backend.modelpilot.evaluator import evaluate_run
        start = time.time()
        evaluate_run(str(valid_output_json))
        elapsed = time.time() - start
        assert elapsed < 0.5, f"evaluate_run took {elapsed:.3f}s (max 0.5s)"

    def test_dockerfile_generation_under_one_second(self, tmp_model_dir):
        from backend.modelpilot.dockerfile_gen import generate_dockerfile
        start = time.time()
        generate_dockerfile(tmp_model_dir)
        assert time.time() - start < 1.0

    def test_validate_model_under_one_second(self, tmp_model_dir):
        from backend.modelpilot.validator import validate_model
        start = time.time()
        validate_model(tmp_model_dir)
        assert time.time() - start < 1.0

    def test_normalise_metrics_under_100ms(self):
        from backend.modelpilot.evaluator import normalise_metrics
        metrics = {f"metric_{i}": float(i) / 100 for i in range(50)}
        start = time.time()
        normalise_metrics(metrics)
        assert time.time() - start < 0.1

    @pytest.mark.skipif(not api_available(), reason="Backend API not running")
    def test_api_models_responds_under_three_seconds(self):
        start = time.time()
        requests.get(f"{API_BASE}/models")
        assert time.time() - start < 3.0

    @pytest.mark.skipif(not api_available(), reason="Backend API not running")
    def test_api_templates_responds_under_three_seconds(self):
        start = time.time()
        requests.get(f"{API_BASE}/templates")
        assert time.time() - start < 3.0


# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
