# ModelPilot — Technical Documentation

**Version:** 1.0  
**Author:** Sai Sri Shruti Sunil  
**Institution:** Heriot-Watt University, School of Mathematical and Computer Sciences  
**Project:** BSc (Hons) Computer Science (Software Engineering) Final Year Dissertation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prerequisites and Installation](#2-prerequisites-and-installation)
3. [Project Structure](#3-project-structure)
4. [System Architecture](#4-system-architecture)
5. [Backend Modules](#5-backend-modules)
6. [REST API Reference](#6-rest-api-reference)
7. [Command-Line Interface Reference](#7-command-line-interface-reference)
8. [Graphical User Interface](#8-graphical-user-interface)
9. [Model Integration Guide](#9-model-integration-guide)
10. [Template System](#10-template-system)
11. [Output Format Specification](#11-output-format-specification)
12. [Evaluation and Testing](#12-evaluation-and-testing)
13. [Configuration Reference](#13-configuration-reference)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. System Overview

ModelPilot is a containerised, model-agnostic execution framework for the reproducible deployment and comparison of machine learning models. It accepts a model folder, builds a Docker image from the model's dependencies, executes the model inside an isolated container, captures logs and outputs, assigns a versioned run identifier, and enables structured comparison across executions.

### 1.1 Core Capabilities

- Automatic Dockerfile generation from `requirements.txt` when no Dockerfile is provided
- Content-addressed image versioning using SHA-256 hashing for reproducibility
- Two-stage GPU detection with automatic CPU fallback
- Structured stdout/stderr log capture per run
- 18-field execution metadata JSON per run
- Metric extraction from output.json supporting nested and flat formats
- ALS-weighted and standard performance scoring
- Cross-run and cross-model comparison with shared-metrics intersection
- Visual performance reports with matplotlib charts
- 15 pre-built Dockerfile templates for common ML environments
- Dual-mode GUI: Developer Mode and Researcher Mode
- 13-command CLI for scripted and automated workflows
- 20-endpoint REST API for GUI integration

### 1.2 Research Questions Addressed

| Question | Description | Confirmed By |
|---|---|---|
| RQ1 | Can containerisation minimise environment-related variation? | Method 2: 5 identical runs, single MD5 hash |
| RQ2 | Does the framework produce stable outputs across OS/hardware? | Method 3: Windows 11 vs Ubuntu 22.04, identical results |
| RQ3 | How effectively does the framework support different expertise levels? | Method 6: SUS 97.9, 100% task completion, 0 errors |

### 1.3 Technology Stack

| Layer | Technology |
|---|---|
| Backend language | Python 3.10 |
| Container engine | Docker (via Docker SDK for Python) |
| API framework | FastAPI + Uvicorn |
| CLI framework | Typer |
| Visualisation | Matplotlib |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Component library | Radix UI |
| Charts | Recharts |
| GUI testing | Playwright |
| Unit testing | pytest |

---

## 2. Prerequisites and Installation

### 2.1 System Requirements

- Windows 10/11 with WSL2, Ubuntu 18.04+, or macOS 12+
- Docker Desktop (Windows/macOS) or Docker Engine (Linux) installed and running
- Python 3.10 or higher
- Node.js 18+ and npm (for GUI only)
- NVIDIA Container Toolkit (optional, for GPU support)

### 2.2 Backend Setup

```bash
# Clone or extract the project
cd modelpilot

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2.3 Starting the Backend API

```bash
# Always run from the modelpilot/ root directory
uvicorn backend.api.main:app --reload
```

The API will be available at `http://localhost:8000`. The interactive API documentation is available at `http://localhost:8000/docs`.

### 2.4 GUI Setup

```bash
cd gui
npm install
npm run dev
```

The GUI will be available at `http://localhost:8080`.

### 2.5 CLI Usage

```bash
# Always run from the modelpilot/ root directory
python -m cli.main --help
```

### 2.6 GPU Support

GPU support requires the NVIDIA Container Toolkit to be installed and the Docker daemon configured with the nvidia runtime. The framework automatically detects GPU availability through a two-stage check and falls back to CPU if either condition is not met. No manual configuration is required.

---

## 3. Project Structure

```
modelpilot/
├── backend/
│   ├── api/
│   │   └── main.py                  # FastAPI application, 20 endpoints
│   └── modelpilot/
│       ├── config.py                # Path constants, template config persistence
│       ├── registry.py              # Model folder resolution, ModelSpec dataclass
│       ├── validator.py             # Dockerfile, requirements, entry script validation
│       ├── dockerfile_gen.py        # Automatic Dockerfile generation
│       ├── templates.py             # Dockerfile template management
│       ├── builder.py               # Docker image building, content-hash versioning
│       ├── runner.py                # Container execution, GPU detection, log capture
│       ├── evaluator.py             # Metric extraction, scoring, comparison
│       ├── reporting.py             # Report generation, comparison reports
│       └── templates/               # 15 pre-built Dockerfile templates
│           ├── als_tabular.Dockerfile
│           ├── als_cnn.Dockerfile
│           ├── als_advanced.Dockerfile
│           ├── sklearn.Dockerfile
│           ├── pytorch_cpu.Dockerfile
│           ├── pytorch_gpu.Dockerfile
│           ├── tensorflow_cpu.Dockerfile
│           ├── tensorflow_gpu.Dockerfile
│           ├── cnn_cpu.Dockerfile
│           ├── cnn_gpu.Dockerfile
│           ├── computer_vision.Dockerfile
│           ├── nlp_transformers.Dockerfile
│           ├── lightgbm.Dockerfile
│           ├── xgboost.Dockerfile
│           └── minimal.Dockerfile
├── cli/
│   └── main.py                      # 13-command Typer CLI
├── gui/
│   ├── src/
│   │   ├── App.tsx                  # Root component, routing
│   │   ├── api/
│   │   │   ├── client.ts            # Typed API client, response normalisation
│   │   │   └── config.ts            # Endpoint configuration
│   │   ├── context/
│   │   │   ├── ModeContext.tsx      # Developer/Researcher mode state
│   │   │   ├── RunsRefreshContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts            # Data fetching hook
│   │   │   └── useCountUp.ts        # Animated counter hook
│   │   ├── pages/
│   │   │   ├── developer/           # 8 Developer Mode pages
│   │   │   └── researcher/          # 8 Researcher Mode pages
│   │   └── components/
│   │       ├── shared/              # 15+ shared components
│   │       └── ui/                  # Radix UI primitive wrappers
│   ├── tests/
│   │   └── gui.test.ts              # 15 Playwright end-to-end tests
│   └── vite.config.ts
├── models/
│   ├── als_classifier/              # Random Forest, synthetic ALS data
│   ├── als_classifier_v2/           # RF tuned hyperparameters
│   ├── als_svm/                     # SVM RBF kernel
│   └── als_fus_real/                # Real-world FUS pipeline
├── inputs/
│   ├── als_data.csv                 # Synthetic ALS biomarker data (150x30)
│   └── fus_data/
│       └── processed_FUSdata.csv    # Real ALS FUS data (960x147)
├── runs/
│   ├── metadata/                    # JSON per build and per run
│   ├── logs/                        # stdout.log + stderr.log per run
│   ├── outputs/                     # output.json per run
│   └── reports/                     # report.json + metrics.png per run
├── evaluate_modelpilot.py           # Integration evaluation script
├── test_modelpilot.py               # 114-test unit suite
├── method3_instructions.md          # Cross-environment test instructions
└── .modelpilot_config.json          # Template selection persistence
```

---

## 4. System Architecture

ModelPilot is organised into four layers.

### 4.1 User Interfaces

Two interaction pathways are provided. The CLI (Typer) invokes backend modules directly, bypassing the API layer entirely. This makes it suitable for scripted workflows and automated pipelines. The GUI (React/TypeScript) communicates exclusively through HTTP requests to the REST API layer on localhost:8000.

Both interfaces invoke identical backend logic, ensuring consistent results regardless of how the system is accessed.

### 4.2 REST API Layer

A local FastAPI server on localhost:8000 serves as the communication layer between the GUI and the backend. All communication is local — no data leaves the machine. CORS is restricted to localhost ports 8080 and 5173 only. The API layer contains no business logic; every endpoint delegates to the same backend modules used by the CLI.

### 4.3 Backend Core

Four subsystems with clearly bounded responsibilities:

**Intake:** config.py, registry.py, validator.py. Responsible for path configuration, model resolution, and pre-build validation.

**Environment:** dockerfile_gen.py, templates.py, builder.py. Responsible for Dockerfile selection or generation, image construction, and content-addressed versioning.

**Execution:** runner.py. Responsible for container lifecycle management, volume mounting, GPU detection, log capture, and metadata persistence.

**Analysis:** evaluator.py, reporting.py. Responsible for metric extraction, performance scoring, comparison, and report generation.

### 4.4 Storage Layer

All storage is local and structured under `runs/`:

| Directory | Contents |
|---|---|
| `runs/metadata/` | Build and run metadata JSON files |
| `runs/logs/` | Per-run stdout.log and stderr.log |
| `runs/outputs/` | Per-run output.json from model execution |
| `runs/reports/` | Per-run and comparison report JSON and PNG files |

All paths are resolved relative to the project root by config.py at import time.

### 4.5 Execution Convention

The framework enforces a fixed volume mounting convention:

- Input directory mounted at `/app/input` (read-only) inside the container
- Per-run output directory mounted at `/app/output` (read-write) inside the container

Models must read inputs from `/app/input` and write `output.json` to `/app/output`. The validator checks entry.py for these path signals and warns if they are absent.

---

## 5. Backend Modules

### 5.1 config.py

Defines all directory constants and manages template selection persistence.

**Constants:**

| Constant | Value | Description |
|---|---|---|
| `PROJECT_ROOT` | Resolved at import | Absolute path to modelpilot/ root |
| `MODELS_DIR` | `PROJECT_ROOT/models` | Model folder location |
| `INPUTS_DIR` | `PROJECT_ROOT/inputs` | Default input data location |
| `RUNS_DIR` | `PROJECT_ROOT/runs` | Base runs directory |
| `RUNS_LOGS_DIR` | `RUNS_DIR/logs` | Log files |
| `RUNS_OUTPUTS_DIR` | `RUNS_DIR/outputs` | Model outputs |
| `RUNS_METADATA_DIR` | `RUNS_DIR/metadata` | Execution metadata |
| `RUNS_REPORTS_DIR` | `RUNS_DIR/reports` | Generated reports |
| `DEFAULT_RUN_TIMEOUT_SECONDS` | 600 | Container execution timeout |
| `DEFAULT_BUILD_BASE_IMAGE` | `python:3.10-slim` | Base image for auto-generation |
| `DEFAULT_CONTAINER_INPUT_DIR` | `/app/input` | Input mount point |
| `DEFAULT_CONTAINER_OUTPUT_DIR` | `/app/output` | Output mount point |
| `IMAGE_NAME_PREFIX` | `modelpilot` | Docker image name prefix |
| `CONFIG_FILE` | `.modelpilot_config.json` | Template selection persistence file |

**Functions:**

```python
ensure_dirs() -> None
# Creates all required run directories if they do not exist.
# Called at the start of every build and run operation.

set_selected_template(name: str) -> None
# Persists a template selection to .modelpilot_config.json.

get_selected_template() -> str | None
# Returns the currently selected template name, or None.

clear_selected_template() -> None
# Removes the selected template from .modelpilot_config.json.
```

---

### 5.2 registry.py

Resolves model folders into validated ModelSpec objects.

**ModelSpec dataclass:**

```python
@dataclass
class ModelSpec:
    name: str                          # Model folder name
    path: Path                         # Absolute path to model folder
    dockerfile_path: Optional[Path]    # Path to Dockerfile if present
    entry_script: Optional[Path]       # Path to entry.py
    requirements_path: Optional[Path]  # Path to requirements.txt
```

**Functions:**

```python
resolve_model(model_name: str) -> ModelSpec
# Locates model folder in MODELS_DIR.
# Enforces FR-1: entry.py must always be present.
# If no Dockerfile, requirements.txt must be present.
# Calls validate_model before returning.
# Raises ValueError with descriptive message on failure.

list_models() -> list[str]
# Returns sorted list of folder names in MODELS_DIR.
```

**Validation rules enforced by resolve_model:**

1. Model folder must exist in `models/`
2. `entry.py` must always be present
3. If no `Dockerfile` is present, `requirements.txt` must be present
4. If neither Dockerfile nor requirements.txt exists, raises ValueError with instructions

---

### 5.3 validator.py

Performs multi-stage validation of model folders.

**validate_dockerfile(path: Path) -> list[str]**

Checks for required Dockerfile instructions:
- `FROM` instruction present
- `COPY` instruction present
- `CMD` or `ENTRYPOINT` present

Returns list of issues found (empty list = valid).

**validate_requirements(path: Path) -> tuple[list[str], list[tuple]]**

Parses requirements.txt and checks packages:
- Returns issues (empty file, file not found)
- Returns suggestions as tuples of (package, suggestion, confidence)

Confidence levels:
- `high` — exact match in COMMON_ERRORS dict (e.g. "sklearn" → "scikit-learn")
- `medium` — fuzzy match via difflib.get_close_matches with cutoff 0.7
- `low` — no suggestion found but package not in known list

Known packages list includes: torch, torchvision, torchaudio, tensorflow, keras, numpy, pandas, scikit-learn, matplotlib, seaborn, opencv-python, nibabel, simpleitk, tqdm, pyyaml.

Common error mappings: pandaz → pandas, numpi → numpy, torh → torch, tensorflo → tensorflow, sklearn → scikit-learn.

**validate_entry(path: Path) -> list[str]**

Scans entry.py content for execution convention signals:
- Input signals: `/app/input`, `input/`, `input_path`, `read_csv`, `load`
- Output signals: `/app/output`, `output.json`, `json.dump`, `write_text`

Returns warning if no input signal found, warning if no output signal found.

**validate_model(model_path: Path) -> dict**

Runs all applicable validators based on model structure. Returns report dict:

```python
{
    "dockerfile": [],      # List of Dockerfile issues
    "requirements": [],    # List of requirements issues
    "entry": [],           # List of entry script issues
    "suggestions": [],     # List of (package, suggestion, confidence) tuples
    "source": "dockerfile" | "requirements"
}
```

---

### 5.4 dockerfile_gen.py

Generates deterministic Dockerfiles for models without a user-supplied Dockerfile.

**generate_dockerfile(model_dir: Path) -> Path**

Generates `Dockerfile.generated` in the model directory. Returns path to the generated file.

Generated Dockerfile structure:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

RUN mkdir -p /app/input /app/output

CMD ["python", "/app/entry.py"]
```

Generation is idempotent: the file is only written if its content differs from any existing `Dockerfile.generated`. This prevents unnecessary file changes that would invalidate the content hash computed by builder.py.

---

### 5.5 templates.py

Manages pre-built Dockerfile templates.

**Constants:**
- `TEMPLATES_DIR` — `backend/modelpilot/templates/`

**Functions:**

```python
list_templates() -> list[str]
# Returns sorted list of template names (stem of .Dockerfile files).

load_template(name: str) -> str
# Returns content of named template as string.
# Raises FileNotFoundError if template does not exist.
```

**Available templates:**

| Template | Base Image | Key Packages |
|---|---|---|
| `minimal` | python:3.10-slim | numpy, pandas |
| `sklearn` | python:3.10-slim | numpy, pandas, scikit-learn |
| `pytorch_cpu` | python:3.10-slim | torch, torchvision, numpy, pandas |
| `pytorch_gpu` | nvidia/cuda:12.1.0-runtime-ubuntu22.04 | torch, torchvision, numpy, pandas |
| `tensorflow_cpu` | python:3.10-slim | tensorflow, numpy, pandas |
| `tensorflow_gpu` | tensorflow/tensorflow:2.13.0-gpu | numpy, pandas |
| `cnn_cpu` | python:3.10-slim | torch, torchvision, numpy, pandas, matplotlib |
| `cnn_gpu` | nvidia/cuda:12.1.0-runtime-ubuntu22.04 | torch, torchvision, numpy, pandas, matplotlib |
| `computer_vision` | python:3.10-slim | opencv-python, torch, torchvision, numpy, matplotlib |
| `nlp_transformers` | python:3.10-slim | transformers, torch, numpy, pandas |
| `lightgbm` | python:3.10-slim | numpy, pandas, scikit-learn, lightgbm |
| `xgboost` | python:3.10-slim | numpy, pandas, scikit-learn, xgboost |
| `als_tabular` | python:3.10-slim | pandas, numpy, scikit-learn, xgboost, lightgbm |
| `als_cnn` | nvidia/cuda:12.1.0-runtime-ubuntu22.04 | torch, torchvision, numpy, pandas, matplotlib, scikit-learn |
| `als_advanced` | nvidia/cuda:12.1.0-runtime-ubuntu22.04 | torch, torchvision, numpy, pandas, scikit-learn, nibabel, simpleitk, matplotlib |

---

### 5.6 builder.py

Builds Docker images with content-addressed versioning.

**build_image(spec: ModelSpec, force_rebuild: bool = False) -> tuple[str, str, dict]**

Returns `(image_tag, build_hash, build_source)`.

**Dockerfile selection priority:**
1. If a template is selected via config.py → writes template as `Dockerfile.template` and uses it
2. Else if model provides a `Dockerfile` → uses it directly
3. Else → calls `generate_dockerfile()` to produce `Dockerfile.generated`

**Content hash computation:**

The `_compute_hash` function builds a SHA-256 hash over:
1. The Dockerfile filename
2. The Dockerfile content
3. For every file in the model directory (sorted, excluding `__pycache__`, `.git`, `.venv`, `pytest_cache`, `.mypy_cache`, and other generated Dockerfiles): the relative file path and its content

The hash is truncated to 12 hexadecimal characters.

**Image tag format:** `modelpilot/{model_name}:{hash}`

**Build caching:** If an image with the computed tag already exists in the Docker daemon and `force_rebuild=False`, the build is skipped and `reused_from_cache: true` is recorded in metadata.

**Build metadata JSON** (written to `runs/metadata/build_{model}_{hash}.json`):

```json
{
  "type": "build",
  "model": "als_classifier",
  "version": "e2c024092738",
  "build_context_hash": "e2c024092738",
  "image_tag": "modelpilot/als_classifier:e2c024092738",
  "image_id": "sha256:...",
  "build_source": {
    "dockerfile": "Dockerfile.generated",
    "generated": true,
    "template": null
  },
  "reused_from_cache": false,
  "status": "completed",
  "build_started_utc": "2026-04-08T06:14:00+00:00",
  "build_finished_utc": "2026-04-08T06:15:30+00:00",
  "duration_seconds": 90.123
}
```

---

### 5.7 runner.py

Manages the full container lifecycle and execution.

**run_image(...) -> str**

Returns the run ID for the completed execution.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `image_tag` | str | required | Docker image tag to run |
| `model_name` | str | required | Model name for metadata |
| `version` | str | required | Version hash for metadata |
| `use_gpu` | bool | False | Request GPU execution |
| `timeout_seconds` | int | 600 | Container execution timeout |
| `input_path` | str | None | Host input directory (defaults to inputs/) |
| `build_source` | dict | None | Build source info for metadata |

**Run ID format:** `run_{YYYYMMDD_HHMMSS}_{6hex}`

Example: `run_20260408_061542_c11d60`

The timestamp component provides chronological ordering; the 6-character hex suffix (from `secrets.token_hex(3)`) prevents collisions from near-simultaneous runs.

**GPU detection sequence:**

1. `_check_host_gpu_available()` — runs `nvidia-smi` with 3-second timeout, checks return code
2. `_docker_supports_gpu(client)` — queries Docker daemon for `nvidia` runtime
3. Both must pass for GPU execution to proceed
4. If GPU execution fails at runtime, retries on CPU with `gpu_fallback: true`

**Volume mounts:**

```python
{
    str(output_dir.resolve()): {"bind": "/app/output", "mode": "rw"},
    str(input_dir.resolve()):  {"bind": "/app/input",  "mode": "ro"},
}
```

**Run status values:**

| Status | Meaning |
|---|---|
| `completed` | Container exited with code 0 and output.json was produced |
| `failed` | Container exited with non-zero code |
| `incomplete` | Container exited with code 0 but no output.json was produced |

**Run metadata JSON** (written to `runs/metadata/{run_id}.json`):

```json
{
  "run_id": "run_20260408_061542_c11d60",
  "model": "als_classifier",
  "version": "e2c024092738",
  "image_tag": "modelpilot/als_classifier:e2c024092738",
  "build_source": {"dockerfile": "Dockerfile.generated", "generated": true, "template": null},
  "timestamp_utc": "2026-04-08T06:15:45.604996+00:00",
  "input_path": "/path/to/inputs",
  "output_path": "/path/to/runs/outputs/run_20260408_061542_c11d60",
  "output_json_path": "/path/to/runs/outputs/run_20260408_061542_c11d60/output.json",
  "output_json_exists": true,
  "gpu_requested": false,
  "gpu_available": false,
  "gpu_runtime_ready": false,
  "gpu_used": false,
  "gpu_fallback": false,
  "hardware_device": "cpu",
  "warning": null,
  "status": "completed",
  "exit_code": 0,
  "duration_seconds": 2.928,
  "error": null
}
```

---

### 5.8 evaluator.py

Extracts metrics from output.json and computes performance scores.

**Supported output formats:**

Format 1 — Nested metrics dict:
```json
{"metrics": {"accuracy": 0.95, "f1": 0.94}}
```

Format 2 — Flat numeric values:
```json
{"accuracy": 0.95, "f1": 0.94, "model": "RF", "status": "completed"}
```

In format 2, only numeric values are extracted; strings are ignored.

**Metric aliases** (normalised on extraction):

| Input key | Normalised to |
|---|---|
| `f1_score` | `f1` |
| `f1score` | `f1` |
| `auc_roc` | `auc` |
| `roc_auc` | `auc` |
| `sensitivity` | `recall` |

**Task type detection:**

Classification if any of: accuracy, precision, recall, sensitivity, specificity, f1, f1_score, auc, auc_roc, roc_auc present.
Regression if any of: mae, mse, rmse, r2 present.
Custom if neither set matched.

**compute_score(metrics, task_type, als_mode=False) -> float**

Standard mode weights (classification):

| Metric | Weight |
|---|---|
| accuracy | 0.25 |
| f1 | 0.25 |
| recall | 0.20 |
| precision | 0.15 |
| auc | 0.10 |
| specificity | 0.05 |

ALS mode weights (classification):

| Metric | Weight |
|---|---|
| recall | 0.35 |
| f1 | 0.25 |
| accuracy | 0.15 |
| precision | 0.10 |
| auc | 0.10 |
| specificity | 0.05 |

Missing metrics contribute 0.0 to the score (graceful partial scoring).

Regression score: `r2 - (0.35 * mae + 0.35 * mse + 0.20 * rmse)`

**evaluate_run(output_json_path, als_mode=False) -> dict**

Returns:
```python
{
    "task_type": "classification",
    "metrics": {"accuracy": 0.9933, "f1": 0.9933, ...},
    "score": 0.9789,
    "warnings": []
}
```

**generate_insights(run_a, run_b, als_mode=False) -> list[str]**

Produces natural-language comparison statements. In ALS mode, adds clinical context to recall comparisons.

---

### 5.9 reporting.py

Generates persistent report artefacts.

**generate_run_report(run_id, als_mode=True) -> dict**

Produces:
- `runs/reports/{run_id}/report.json` — structured report with metadata and evaluation
- `runs/reports/{run_id}/metrics.png` — bar chart of extracted metrics (if metrics present)

**generate_comparison_report(run_ids, als_mode=True) -> dict**

Requires at least 2 runs with valid metrics. Produces:
- `runs/reports/comparisons/{id1}__{id2}/comparison.json`
- `runs/reports/comparisons/{id1}__{id2}/comparison.png` — grouped bar chart on shared metrics

Shared metrics are the intersection of metric keys across all selected runs. Runs with no valid metrics are filtered silently; comparison raises ValueError only if fewer than 2 usable runs remain.

**generate_same_model_comparison(run_id, als_mode=True, max_runs=5) -> dict**

Automatically retrieves up to 4 previous runs of the same model and compares them with the specified run.

---

## 6. REST API Reference

Base URL: `http://localhost:8000`

### 6.1 Model Management

**GET /models**
Returns list of available model folders.
```json
{"models": ["als_classifier", "als_classifier_v2", "als_svm"]}
```

### 6.2 Build

**POST /build**

Request body:
```json
{
  "model": "als_classifier",
  "template": "sklearn",
  "rebuild": false
}
```

Response:
```json
{
  "model": "als_classifier",
  "image_tag": "modelpilot/als_classifier:e2c024092738",
  "version": "e2c024092738",
  "build_source": {"dockerfile": "Dockerfile.generated", "generated": true, "template": null}
}
```

### 6.3 Run

**POST /run**

Request body:
```json
{
  "model": "als_classifier",
  "use_gpu": false,
  "timeout": 600,
  "input_path": null
}
```

Executes the full pipeline: resolve → build (cached if unchanged) → run → evaluate. Returns run metadata and inline evaluation results.

### 6.4 Run Management

**GET /runs** — List all runs with summary metadata

**GET /run/{run_id}** — Full metadata for a specific run

**GET /run/{run_id}/logs** — stdout and stderr log content

**GET /run/{run_id}/output** — Raw output.json content

**GET /run/{run_id}/related** — Previous runs of the same model

### 6.5 Reporting

**GET /report/{run_id}** — Inline metric evaluation (no file generation)

**POST /report/{run_id}/visual** — Generate full report with chart, returns report JSON

### 6.6 Comparison

**POST /compare**
```json
{"run_ids": ["run_abc", "run_def", "run_ghi"]}
```
Multi-run comparison with ranking.

**POST /compare/two**
```json
{"run_id_1": "run_abc", "run_id_2": "run_def"}
```
Two-run comparison with pairwise differences and insights.

**POST /compare/same-model?run_id={run_id}**
Automatic same-model comparison for a given run.

### 6.7 Template Management

**GET /templates** — List all available templates

**GET /templates/{name}** — Get template content

**GET /templates/selected** — Get currently selected template

**POST /templates/select** — Select a template
```json
{"name": "sklearn"}
```

**DELETE /templates/selected** — Clear template selection

---

## 7. Command-Line Interface Reference

All commands are invoked as:
```bash
python -m cli.main [command] [arguments] [options]
```

Run from the `modelpilot/` root directory.

### 7.1 build

```bash
python -m cli.main build <model> [--template TEMPLATE] [--rebuild]
```

Resolves, validates, and builds a Docker image for the specified model.

| Option | Description |
|---|---|
| `--template` | Use a named template instead of auto-generation or user Dockerfile |
| `--rebuild` | Force rebuild even if cached image exists |

Output includes: model name, version hash, image tag, Dockerfile source, cache status.

### 7.2 run

```bash
python -m cli.main run <model> [--gpu] [--timeout SECONDS] [--input PATH] [--rebuild]
```

Builds (or reuses cached) and executes the model.

| Option | Default | Description |
|---|---|---|
| `--gpu` | False | Request GPU execution |
| `--timeout` | 600 | Container execution timeout in seconds |
| `--input` | inputs/ | Host directory to mount at /app/input |
| `--rebuild` | False | Force rebuild before running |

Output includes: run summary, build info, device used, and inline evaluation results on success. On failure, displays stdout/stderr logs and targeted error hints.

### 7.3 list-models

```bash
python -m cli.main list-models
```

Lists all available model folders in `models/`.

### 7.4 list-runs

```bash
python -m cli.main list-runs
```

Lists all past runs with model name, status, and duration.

### 7.5 report

```bash
python -m cli.main report <run_id>
```

Evaluates a completed run and displays the composite score and all extracted metrics.

### 7.6 compare

```bash
python -m cli.main compare <run_id_1> <run_id_2>
```

Compares two runs by computing pairwise metric differences and generating natural-language insights.

### 7.7 visual-report

```bash
python -m cli.main visual-report <run_id>
```

Generates a persistent report JSON and metrics chart PNG for the specified run.

### 7.8 visual-compare

```bash
python -m cli.main visual-compare <run_id_1>,<run_id_2>[,<run_id_3>...]
```

Generates a comparison report and grouped bar chart for the specified runs (comma-separated).

### 7.9 compare-same-model

```bash
python -m cli.main compare-same-model <run_id>
```

Automatically retrieves previous runs of the same model and generates a comparison.

### 7.10 list-templates

```bash
python -m cli.main list-templates
```

Lists all available Dockerfile templates.

### 7.11 view-template

```bash
python -m cli.main view-template <name>
```

Displays the content of a named template.

### 7.12 select-template

```bash
python -m cli.main select-template <name>
```

Selects a template for use in the next build. Persists to `.modelpilot_config.json`.

### 7.13 clear-template

```bash
python -m cli.main clear-template
```

Clears the selected template. The next build will use auto-generation or a user-supplied Dockerfile.

---

## 8. Graphical User Interface

### 8.1 Starting the GUI

```bash
cd gui
npm install   # first time only
npm run dev
```

Navigate to `http://localhost:8080`. The backend API must be running on port 8000.

### 8.2 Mode Selection

On first launch, the mode selector presents two options:

**Developer Mode** — dark theme, full technical detail, version hashes, raw logs, four comparison visualisation types. Recommended for ML engineers and developers.

**Researcher Mode** — light theme, plain-English labels, simplified progress indicators, friendly metric explanations. Recommended for biomedical researchers and non-technical users.

Mode selection persists in browser localStorage under the key `modelpilot_mode`. Mode can be switched at any time from the sidebar without losing the current page context.

### 8.3 Developer Mode Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | /dashboard | System stats, recent runs, quick actions, performance overview |
| Models | /models | List of available models with quick-build links |
| Load & Build | /build | Model selection, template selection, force-rebuild toggle, build progress indicator |
| Run Model | /run | Model selection, input path, GPU toggle, timeout, execution progress |
| Past Results | /past-results | All runs with status, metrics, device, version |
| Results | /results/:run_id | Tabbed view: Outputs, Metrics, Logs, Artifacts, radar chart, export |
| Compare | /compare | Multi-run selection, table/radar/bar/timeline visualisations |
| Templates | /templates | Template browser, preview, select/clear |

### 8.4 Researcher Mode Pages

Same routes, parallel implementations with simplified language and components:

| Developer Label | Researcher Label |
|---|---|
| Load & Build | Prepare Model |
| Run Model | Run Analysis |
| Past Results | Past Analyses |
| GPU Acceleration | Accelerated Processing |
| Build Container | Prepare Model |
| Version hash | (hidden) |
| stdout/stderr logs | Analysis Log (stdout only) |
| Radar chart with technical names | Circular gauges with friendly names |
| Four comparison views | Single horizontal bar chart with insight cards |

**Friendly metric names in Researcher Mode:**

| Technical name | Researcher label | Explanation shown |
|---|---|---|
| accuracy | Overall Accuracy | How often the model makes correct predictions overall |
| recall | Sensitivity | How well the model detects positive cases |
| precision | Precision | How often positive predictions are correct |
| f1 | Balance Score | A balanced measure of precision and sensitivity |
| auc | Detection Score | The model's ability to distinguish between classes |
| score | Overall Score | Overall performance score across all metrics |

### 8.5 Shared Components

| Component | Purpose |
|---|---|
| StatCard | Numeric statistic with icon and label |
| MetricCard | Single metric value with percentage formatting |
| StatusBadge | Run status indicator (completed/failed/incomplete) |
| DeviceBadge | Hardware device indicator (cpu/gpu) |
| RunIdDisplay | Formatted run identifier with copy button |
| TerminalViewer | Monospace log display with line colouring |
| JsonViewer | Syntax-highlighted collapsible JSON viewer |
| CircularGauge | SVG arc gauge for Researcher Mode metrics |
| HorizontalBar | Proportional bar for Researcher Mode comparison |
| BuildSteps | Animated step progress indicator |
| PerformanceReportModal | Full report overlay with chart |
| SkeletonLoader | Loading placeholder |
| EmptyState | Empty collection placeholder |
| ErrorState | API error display |
| ToastNotification | Success/error/info toast system |
| CrossModeHint | Contextual suggestion to switch modes |

---

## 9. Model Integration Guide

### 9.1 Minimum Requirements

Every model must provide:
- `entry.py` — the execution entry point
- Either `requirements.txt` or a `Dockerfile` (or both)

### 9.2 Option A: requirements.txt (recommended for most models)

Provide `entry.py` and `requirements.txt`. ModelPilot auto-generates the Dockerfile.

```
models/
└── my_model/
    ├── entry.py
    ├── requirements.txt
    └── model.py (or any other files)
```

Requirements format:
```
numpy==1.24.3
scikit-learn==1.3.0
pandas==2.0.3
```

Pin exact versions for reproducibility.

### 9.3 Option B: User-supplied Dockerfile

Provide `entry.py` and `Dockerfile`. ModelPilot uses the Dockerfile as-is.

```
models/
└── my_model/
    ├── entry.py
    ├── Dockerfile
    └── model.py
```

### 9.4 Writing entry.py

entry.py must:
1. Read input data from `/app/input/`
2. Write results to `/app/output/output.json`

Minimal example:
```python
import json
import os
import pandas as pd

# Read input
df = pd.read_csv("/app/input/data.csv")

# Run your model
results = my_model(df)

# Write output
os.makedirs("/app/output", exist_ok=True)
with open("/app/output/output.json", "w") as f:
    json.dump({
        "task_type": "classification",
        "metrics": {
            "accuracy": 0.95,
            "f1": 0.93,
            "recall": 0.91
        },
        "status": "completed"
    }, f)
```

### 9.5 Output Format

output.json can use either format:

**Format 1 — Nested (recommended):**
```json
{
    "task_type": "classification",
    "model": "MyModel",
    "metrics": {
        "accuracy": 0.95,
        "f1": 0.93,
        "recall": 0.91,
        "precision": 0.94,
        "specificity": 0.97,
        "loss": 0.05
    },
    "status": "completed"
}
```

**Format 2 — Flat:**
```json
{
    "accuracy": 0.95,
    "f1": 0.93,
    "recall": 0.91,
    "status": "completed"
}
```

### 9.6 Supported Metric Names

The evaluator recognises and normalises these metric names:

Classification: `accuracy`, `precision`, `recall`, `sensitivity` (→recall), `specificity`, `f1`, `f1_score` (→f1), `f1score` (→f1), `auc`, `auc_roc` (→auc), `roc_auc` (→auc), `loss`

Regression: `mae`, `mse`, `rmse`, `r2`

### 9.7 Running Your Model

```bash
# Build
python -m cli.main build my_model

# Run with default input
python -m cli.main run my_model

# Run with custom input
python -m cli.main run my_model --input /path/to/data/folder

# Run with GPU
python -m cli.main run my_model --gpu

# View results
python -m cli.main report <run_id>
```

---

## 10. Template System

### 10.1 Selecting a Template

Templates provide pre-configured Dockerfiles for common ML environments.

Via CLI:
```bash
python -m cli.main select-template sklearn
python -m cli.main build my_model
python -m cli.main clear-template
```

Via GUI: Navigate to Templates page, select a template, proceed to Build.

Via API:
```bash
POST /templates/select
{"name": "sklearn"}

POST /build
{"model": "my_model"}
```

### 10.2 Template Priority

When building, the Dockerfile source is selected in this order:
1. Selected template (if set via select-template or API)
2. User-provided `Dockerfile` in model folder
3. Auto-generated `Dockerfile.generated` from requirements.txt

### 10.3 ALS-Specific Templates

Three templates are optimised for ALS research workflows:

- `als_tabular` — scikit-learn, XGBoost, LightGBM for tabular biomarker data
- `als_cnn` — PyTorch + GPU for CNN-based imaging models
- `als_advanced` — PyTorch + GPU + nibabel + SimpleITK for full neuroimaging pipelines

---

## 11. Output Format Specification

### 11.1 Run Outputs

After each run, the following are written:

| File | Location | Description |
|---|---|---|
| `output.json` | `runs/outputs/{run_id}/output.json` | Model output (written by model) |
| `stdout.log` | `runs/logs/{run_id}/stdout.log` | Container stdout |
| `stderr.log` | `runs/logs/{run_id}/stderr.log` | Container stderr |
| `{run_id}.json` | `runs/metadata/{run_id}.json` | 18-field execution metadata |

### 11.2 Report Outputs

| File | Location | Description |
|---|---|---|
| `report.json` | `runs/reports/{run_id}/report.json` | Full evaluation report |
| `metrics.png` | `runs/reports/{run_id}/metrics.png` | Bar chart of metrics |
| `comparison.json` | `runs/reports/comparisons/{ids}/comparison.json` | Comparison report |
| `comparison.png` | `runs/reports/comparisons/{ids}/comparison.png` | Grouped bar chart |

---

## 12. Evaluation and Testing

### 12.1 Running Unit Tests

```bash
# Run all 114 tests
pytest test_modelpilot.py -v

# Run a specific module
pytest test_modelpilot.py -v -k "TestEvaluator"
pytest test_modelpilot.py -v -k "TestValidator"
pytest test_modelpilot.py -v -k "TestConfig"
```

Unit test classes and counts:

| Class | Tests | Coverage |
|---|---|---|
| TestConfig | 10 | Path resolution, template get/set/clear |
| TestTemplates | 8 | List, load, error handling |
| TestValidator | 13 | Dockerfile, requirements, entry validation, fuzzy matching |
| TestDockerfileGen | 9 | Generation, idempotency |
| TestRegistry | 10 | Model resolution, FR-1 enforcement, error cases |
| TestEvaluator | 17 | Metric extraction, aliases, ALS scoring, comparison, degradation |
| TestEdgeCases | 10 | Empty JSON, string metrics, zero scores, corrupted output |
| TestAPI | 13 | All REST endpoints |
| TestCLI | 16 | All CLI commands |
| TestPerformance | 8 | API response times vs NFR-4 |

### 12.2 Running GUI Tests

```bash
# Backend must be running on port 8000
# Frontend must be running on port 8080

cd gui
npx playwright test --config playwright.config.ts

# Headed mode (see browser)
npx playwright test --headed --config playwright.config.ts
```

### 12.3 Running Integration Evaluation

```bash
# Prerequisites:
# - Backend running: uvicorn backend.api.main:app --reload
# - Docker Desktop running
# - models/ and inputs/ populated

python evaluate_modelpilot.py
```

Produces results in `evaluation_results/`:
- `evaluation_summary.json` — all 76 checks with pass/fail
- `method2_repeatability.json` — 5-run repeatability results
- `method4_dependency_manifest.json` — container package manifest
- `method5_logging_report.json` — logging completeness report

### 12.4 Cross-Environment Testing (Method 3)

See `method3_instructions.md` for the complete procedure. In summary:
1. Run `python evaluate_modelpilot.py` on Machine A, copy the output.json from the als_classifier run
2. Run the same model on Machine B, copy its output.json
3. Compare the two files — metrics should be identical to 4 decimal places

---

## 13. Configuration Reference

### 13.1 .modelpilot_config.json

Stores the currently selected Dockerfile template. Managed automatically by config.py.

```json
{
  "selected_template": "sklearn"
}
```

To clear manually: delete the file or run `python -m cli.main clear-template`.

### 13.2 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL for GUI |

Set in `gui/.env` to change the backend URL.

### 13.3 Default Timeouts and Limits

| Setting | Value | Location |
|---|---|---|
| Container execution timeout | 600 seconds | `config.py` DEFAULT_RUN_TIMEOUT_SECONDS |
| GPU detection timeout | 3 seconds | `runner.py` subprocess timeout |
| Image name prefix | `modelpilot` | `config.py` IMAGE_NAME_PREFIX |
| Default base image | `python:3.10-slim` | `config.py` DEFAULT_BUILD_BASE_IMAGE |

---

## 14. Troubleshooting

### 14.1 Build Failures

**"Missing entry.py"**
Every model must have an `entry.py` file in the model folder.

**"No Dockerfile found. Model must contain either a Dockerfile or requirements.txt"**
Add a `requirements.txt` to the model folder, or supply a `Dockerfile`.

**pip install fails during build**
Check requirements.txt for typos. Run `python -m cli.main build <model>` — the CLI will display the relevant Docker error lines. Common fixes:
- `sklearn` → `scikit-learn`
- `pandaz` → `pandas`
- `numpi` → `numpy`

**Build succeeds but image is very large**
Consider using a template with a smaller base image such as `sklearn` (python:3.10-slim) instead of a GPU image.

### 14.2 Run Failures

**Status: incomplete — output.json was not produced**
The container executed successfully but did not write `output.json` to `/app/output/`. Check that entry.py writes to exactly `/app/output/output.json`.

**ModuleNotFoundError in stderr**
A required package is not in requirements.txt. Add it and rebuild.

**Container timeout**
Increase timeout: `python -m cli.main run <model> --timeout 1200`

**GPU requested but not available**
The system will automatically fall back to CPU. Check that the NVIDIA Container Toolkit is installed and Docker is configured with the nvidia runtime if GPU execution is required.

### 14.3 Evaluation Issues

**"At least two runs with valid metrics are required for comparison"**
One or more selected runs did not produce a valid output.json with numeric metrics. Check run status with `python -m cli.main list-runs` and ensure at least two completed runs are available.

**No metrics shown after run**
output.json was produced but contains no recognised metric names. Ensure metric keys match the supported names listed in Section 11.6, or add a `"metrics"` nested dict.

### 14.4 GUI Issues

**GUI shows no models or runs**
Ensure the backend API is running: `uvicorn backend.api.main:app --reload`

**API connectivity error in browser**
Check that the backend is running on port 8000 and the frontend on port 8080. CORS is configured for these ports only.

**Mode not persisting after browser refresh**
Mode is stored in localStorage. If localStorage is disabled or cleared, the mode selector will appear again on next launch. This is expected behaviour.

### 14.5 Common Commands Quick Reference

```bash
# Start backend
uvicorn backend.api.main:app --reload

# Start GUI
cd gui && npm run dev

# Build a model
python -m cli.main build als_classifier

# Run a model
python -m cli.main run als_classifier

# Run with custom input
python -m cli.main run als_classifier --input inputs/

# View results
python -m cli.main list-runs
python -m cli.main report run_20260408_061542_c11d60

# Compare runs
python -m cli.main compare run_abc run_def

# Use a template
python -m cli.main select-template sklearn
python -m cli.main build my_model
python -m cli.main clear-template

# Run all tests
pytest test_modelpilot.py -v

# Run integration evaluation
python evaluate_modelpilot.py
```
