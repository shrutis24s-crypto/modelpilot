# ModelPilot

**A containerised, model-agnostic execution framework for reproducible machine learning.**

ModelPilot solves one of the most common and time-consuming problems in ML research: getting models to run reliably across different machines, environments, and users. You provide a model folder. ModelPilot handles everything else — building the container, running the model, capturing all outputs and logs, versioning the execution, and making the results comparable across runs.

Built as part of a final-year dissertation project at Heriot-Watt University, with a focus on ALS (Amyotrophic Lateral Sclerosis) healthcare ML research, but designed to work with any machine learning model.

---

## What ModelPilot does

- **Automatic environment generation** — give it a `requirements.txt` and it writes the Dockerfile for you
- **Containerised execution** — every model runs in an isolated Docker container with pinned dependencies
- **Content-addressed versioning** — images are tagged with a SHA-256 hash of the model files, so identical code always produces the same tag across machines
- **Structured logging** — every run captures stdout, stderr, and an 18-field metadata JSON
- **Performance evaluation** — extracts metrics from `output.json` and scores them, with an ALS-specific weighted mode
- **Cross-run comparison** — compare any number of runs with table, radar, bar, and timeline visualisations
- **Dual-mode GUI** — Developer Mode for engineers, Researcher Mode for biomedical researchers with no command-line experience
- **13-command CLI** — for scripted workflows and automation
- **15 pre-built templates** — for common ML environments including PyTorch, TensorFlow, scikit-learn, and ALS-specific pipelines

---

## Evaluation results

ModelPilot was evaluated across six methods:

| Method | Result |
|---|---|
| Functional validation (18 requirements) | 38/38 checks passed, 100% |
| Deterministic repeatability (5 runs) | Identical MD5 hash across all 5 runs |
| Cross-environment (Windows 11 vs Ubuntu 22.04) | Identical results to 4 decimal places |
| Dependency isolation | All 4 packages at exact pinned versions inside container |
| Logging transparency | All 11 provenance criteria satisfied |
| Usability study (6 participants) | Mean SUS 97.9, 100% task completion, 0 errors |

Unit tests: 114/114 passing. GUI tests: 15/15 passing.

---

## Prerequisites

Before you start, make sure you have:

- **Python 3.10** or higher
- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux) — must be running
- **Node.js 18+** and **npm** — only needed if you want to use the GUI
- **NVIDIA Container Toolkit** — optional, only needed for GPU model execution

---

## Installation

### 1. Clone or extract the project

```bash
cd modelpilot
```

### 2. Set up the Python environment

```bash
# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Install GUI dependencies (optional)

```bash
cd gui
npm install
cd ..
```

That's it. No database setup, no cloud services, no external API keys. Everything runs locally.

---

## Quick start

### Option A: CLI (no server needed)

Open a terminal in the `modelpilot/` directory with your virtual environment activated.

```bash
# Build a model
python -m cli.main build als_classifier

# Run it
python -m cli.main run als_classifier

# See results
python -m cli.main list-runs
python -m cli.main report run_20260409_035651_ab0dfe

# Compare two runs
python -m cli.main compare run_20260409_035651_ab0dfe run_20260409_035700_e4eba4
```

### Option B: GUI (requires backend server)

**Terminal 1 — start the backend:**
```bash
uvicorn backend.api.main:app --reload
```

**Terminal 2 — start the frontend:**
```bash
cd gui
npm run dev
```

Open your browser at **http://localhost:8080**

On first launch you will see the mode selector. Choose **Developer Mode** if you're familiar with Docker and ML tools, or **Researcher Mode** if you prefer plain-English labels and a simplified interface. You can switch between modes at any time from the sidebar without losing your place.

---

## Adding your own model

ModelPilot needs two things from your model:

1. An `entry.py` file that runs your model
2. Either a `requirements.txt` or a `Dockerfile`

### Step 1 — Create a model folder

```
models/
└── my_model/
    ├── entry.py
    ├── requirements.txt   ← or Dockerfile
    └── model.py           ← any other files you need
```

### Step 2 — Write entry.py

Your entry point must read from `/app/input/` and write results to `/app/output/output.json`:

```python
import json
import os
import pandas as pd

# Read your input data
df = pd.read_csv("/app/input/data.csv")

# Run your model
predictions = my_model.predict(df)
accuracy = calculate_accuracy(predictions)

# Write results — this is what ModelPilot reads
os.makedirs("/app/output", exist_ok=True)
with open("/app/output/output.json", "w") as f:
    json.dump({
        "task_type": "classification",
        "metrics": {
            "accuracy": accuracy,
            "f1": f1_score,
            "recall": recall,
            "specificity": specificity
        },
        "status": "completed"
    }, f)
```

### Step 3 — Write requirements.txt

Pin your versions for reproducibility:

```
numpy==1.24.3
scikit-learn==1.3.0
pandas==2.0.3
```

ModelPilot will auto-generate the Dockerfile from this file. If you have complex dependencies, you can provide your own `Dockerfile` instead and ModelPilot will use it without modification.

### Step 4 — Build and run

```bash
python -m cli.main build my_model
python -m cli.main run my_model
```

Or in the GUI: navigate to **Load & Build**, select your model, click **Build Container**, then go to **Run Model**.

---

## Project structure

```
modelpilot/
├── backend/
│   ├── api/
│   │   └── main.py              # FastAPI server — 20 endpoints
│   └── modelpilot/
│       ├── config.py            # Paths, template persistence
│       ├── registry.py          # Model folder resolution
│       ├── validator.py         # Model validation and suggestions
│       ├── dockerfile_gen.py    # Auto Dockerfile generation
│       ├── templates.py         # Template management
│       ├── builder.py           # Docker image building + versioning
│       ├── runner.py            # Container execution + GPU detection
│       ├── evaluator.py         # Metric extraction and scoring
│       ├── reporting.py         # Reports and comparison charts
│       └── templates/           # 15 pre-built Dockerfiles
├── cli/
│   └── main.py                  # 13-command CLI
├── gui/                         # React + TypeScript frontend
│   ├── src/
│   └── tests/
│       └── gui.test.ts          # 15 Playwright end-to-end tests
├── models/                      # Your model folders go here
│   ├── als_classifier/
│   ├── als_classifier_v2/
│   ├── als_svm/
│   └── als_fus_real/
├── inputs/                      # Input data (mounted at /app/input)
│   └── als_data.csv
├── runs/                        # All outputs (auto-created)
│   ├── metadata/
│   ├── logs/
│   ├── outputs/
│   └── reports/
├── evaluate_modelpilot.py       # Integration evaluation script
├── test_modelpilot.py           # 114 unit tests
└── .modelpilot_config.json      # Template selection (auto-managed)
```

---

## CLI reference

All commands are run from the `modelpilot/` directory as:

```bash
python -m cli.main [command] [arguments] [options]
```

| Command | Description |
|---|---|
| `build <model>` | Build a Docker image for the model |
| `run <model>` | Build (or reuse cached) and execute the model |
| `list-models` | List all available models |
| `list-runs` | List all past runs with status and duration |
| `report <run_id>` | Show evaluation results for a run |
| `compare <run_id_1> <run_id_2>` | Compare two runs with metric differences and insights |
| `visual-report <run_id>` | Generate a PDF performance report |
| `visual-compare <id1,id2,...>` | Generate a comparison chart for multiple runs |
| `compare-same-model <run_id>` | Auto-compare a run against previous runs of the same model |
| `list-templates` | List all available Dockerfile templates |
| `view-template <name>` | Show the content of a template |
| `select-template <name>` | Set a template for the next build |
| `clear-template` | Remove the selected template |

### Key flags

```bash
# build
python -m cli.main build my_model --template sklearn    # use a template
python -m cli.main build my_model --rebuild             # force rebuild even if cached

# run
python -m cli.main run my_model --gpu                   # request GPU execution
python -m cli.main run my_model --input /path/to/data   # custom input folder
python -m cli.main run my_model --timeout 1200          # custom timeout (seconds)
python -m cli.main run my_model --rebuild               # force rebuild before running
```

---

## Templates

Templates are pre-built Dockerfiles for common ML environments. Use them when your model needs specific libraries that aren't in a simple requirements.txt, or when you want GPU support without writing your own Dockerfile.

```bash
# See all available templates
python -m cli.main list-templates

# Use a template for your next build
python -m cli.main select-template sklearn
python -m cli.main build my_model
python -m cli.main clear-template  # clear after building if needed
```

| Template | Best for |
|---|---|
| `minimal` | Simple scripts with numpy and pandas |
| `sklearn` | scikit-learn classification and regression |
| `pytorch_cpu` | PyTorch models on CPU |
| `pytorch_gpu` | PyTorch models requiring GPU |
| `tensorflow_cpu` | TensorFlow on CPU |
| `tensorflow_gpu` | TensorFlow with GPU support |
| `cnn_cpu` | Convolutional neural networks on CPU |
| `cnn_gpu` | CNNs requiring GPU |
| `computer_vision` | OpenCV + PyTorch image processing |
| `nlp_transformers` | HuggingFace Transformers NLP |
| `lightgbm` | Gradient boosting with LightGBM |
| `xgboost` | Gradient boosting with XGBoost |
| `als_tabular` | ALS tabular biomarker data (RF, SVM, XGBoost) |
| `als_cnn` | ALS imaging models with PyTorch GPU |
| `als_advanced` | ALS neuroimaging pipelines (nibabel, SimpleITK, GPU) |

---

## Output format

Your `output.json` can use either format:

**Nested (recommended):**
```json
{
    "task_type": "classification",
    "metrics": {
        "accuracy": 0.95,
        "f1": 0.93,
        "recall": 0.91,
        "specificity": 0.97,
        "loss": 0.05
    },
    "status": "completed"
}
```

**Flat:**
```json
{
    "accuracy": 0.95,
    "f1": 0.93,
    "recall": 0.91,
    "status": "completed"
}
```

Supported metric names: `accuracy`, `precision`, `recall`, `sensitivity`, `specificity`, `f1`, `f1_score`, `auc`, `auc_roc`, `roc_auc`, `loss` for classification. `mae`, `mse`, `rmse`, `r2` for regression. Aliases are normalised automatically.

---

## Versioning and reproducibility

Every model build is assigned a version tag based on the SHA-256 hash of your Dockerfile and model files:

```
modelpilot/my_model:e2c024092738
```

If nothing in your model folder changes between builds, the hash stays the same and the existing image is reused — build completes in milliseconds instead of minutes. If anything changes, a new hash is computed and a fresh image is built.

This means:
- Two machines building the same unchanged model will produce the same version tag
- You can always tell exactly which code version produced any given run
- Comparing two runs with the same version tag guarantees the environment was identical

---

## What gets stored per run

Every run creates:

| File | Location | Contents |
|---|---|---|
| `output.json` | `runs/outputs/{run_id}/` | Your model's results |
| `stdout.log` | `runs/logs/{run_id}/` | Container stdout |
| `stderr.log` | `runs/logs/{run_id}/` | Container stderr |
| `{run_id}.json` | `runs/metadata/` | 18-field execution provenance record |

The metadata record includes: run ID, model name, version hash, image tag, UTC timestamp, input path, output path, GPU flags, hardware device, build source, status, exit code, duration, and error information. Every run is fully documented without you having to do anything.

---

## GUI overview

The GUI provides two complete parallel interfaces sharing the same backend:

### Developer Mode (dark theme)
For users familiar with Docker, Python, and ML workflows. Shows full technical detail including version hashes, device badges, raw JSON outputs, terminal-style log viewers, and four visualisation types on the comparison page.

### Researcher Mode (light theme)
For biomedical researchers and non-technical users. Uses plain-English labels throughout — "Prepare Model" instead of "Build Container", "Sensitivity" instead of "recall", "Balance Score" instead of "f1". Results are shown as circular gauges with explanations. The comparison page shows a simple two-run view with natural-language insight cards.

### Switching between modes
The sidebar includes a mode-switch button that works from any page. Your current route is preserved when you switch — if you are looking at results in Researcher Mode and switch to Developer Mode, you land on the same results page in Developer Mode. You can switch back at any time.

### Pages

| Page | Developer Mode name | Researcher Mode name |
|---|---|---|
| Overview | Dashboard | Home |
| Model list | Models | My Models |
| Build | Load & Build | Prepare Model |
| Execute | Run Model | Run Analysis |
| History | Past Results | Past Analyses |
| Run detail | Results | Results |
| Multi-run | Compare | Compare Results |
| Environments | Templates | Model Templates |

---

## Running the tests

### Unit tests

```bash
# Run all 114 tests
pytest test_modelpilot.py -v

# Run a specific class
pytest test_modelpilot.py -v -k "TestEvaluator"
pytest test_modelpilot.py -v -k "TestValidator"
```

### GUI tests

The backend must be running on port 8000 and the frontend on port 8080.

```bash
cd gui
npx playwright test --config playwright.config.ts

# See the browser while tests run
npx playwright test --headed --config playwright.config.ts
```

### Integration evaluation

Runs all evaluation methods against the live system. Docker must be running.

```bash
# Start the backend first
uvicorn backend.api.main:app --reload

# In a second terminal
python evaluate_modelpilot.py
```

Results are saved to `evaluation_results/`.

---

## Troubleshooting

### "Missing entry.py"
Every model folder must contain `entry.py`. This is the file ModelPilot runs inside the container.

### "No Dockerfile found. Model must contain either a Dockerfile or requirements.txt"
Add a `requirements.txt` to your model folder, or provide a `Dockerfile`.

### Build fails with pip error
Check `requirements.txt` for typos. Common ones ModelPilot will suggest corrections for:
- `sklearn` → `scikit-learn`
- `pandaz` → `pandas`
- `numpi` → `numpy`
- `torh` → `torch`

### Status: incomplete (no output.json)
Your model ran successfully but did not write `output.json` to `/app/output/`. Check that `entry.py` writes to exactly `/app/output/output.json`.

### GPU not used despite --gpu flag
GPU execution requires two things to both be true: the host has a GPU visible to `nvidia-smi`, and Docker is configured with the NVIDIA Container Toolkit runtime. If either is missing, ModelPilot falls back to CPU automatically and records `gpu_fallback: true` in the run metadata.

### GUI shows no data
Make sure the backend API is running: `uvicorn backend.api.main:app --reload`. The GUI connects to `localhost:8000` — if the backend is not running, all pages will show empty states.

### Container execution times out
Increase the timeout: `python -m cli.main run my_model --timeout 1200`

---

## Architecture overview

```
User Interfaces
├── CLI (Typer) ──────────────────────────────────┐
│                                                  ↓
└── GUI (React/TypeScript) → REST API (FastAPI) → Backend Core
                              localhost:8000       ├── Intake (config, registry, validator)
                                                   ├── Environment (dockerfile_gen, templates, builder)
                                                   ├── Execution (runner)
                                                   └── Analysis (evaluator, reporting)
                                                              ↓
                                                   Local Storage (runs/metadata, logs, outputs, reports)
```

The CLI calls backend modules directly. The GUI goes through the local FastAPI server. Both interfaces invoke identical backend logic — there is no difference in what they can do, only in how they present information.

All execution is local. No data leaves your machine. CORS is locked to localhost only. This makes ModelPilot suitable for healthcare research where data governance and GDPR compliance require local processing.

---

## Configuration

### Template selection
Template selection persists across sessions in `.modelpilot_config.json`. Managed automatically — you should not need to edit this file manually.

### Custom backend URL (GUI)
If you need the GUI to point to a different backend address, set `VITE_API_URL` in `gui/.env`:
```
VITE_API_URL=http://localhost:8000
```

### Default timeouts
Container execution defaults to 600 seconds (10 minutes). Override with `--timeout` on the CLI or the timeout field in the GUI Run page.

---

## Supported platforms

| Platform | Status |
|---|---|
| Windows 11 with WSL2 + Docker Desktop | Fully tested |
| Ubuntu 22.04 with native Docker | Fully tested |
| macOS with Docker Desktop | Should work — not formally tested |
| ARM (Apple Silicon) | Not tested — may require multi-arch image configuration |

---

## Limitations

- Reproducibility guarantees apply to deterministic models. GPU-accelerated deep learning models (PyTorch, TensorFlow) may produce slightly different results across runs due to CUDA non-determinism even with identical code and dependencies. This is an inherent property of GPU floating-point operations, not specific to ModelPilot.
- Auto-generated Dockerfiles handle pure Python dependency stacks. Models requiring system-level packages, compiled C extensions, or multi-stage builds need a user-supplied Dockerfile.
- Cross-architecture reproducibility (x86-64 to ARM) has not been tested.

---

## Acknowledgements

Built at Heriot-Watt University, School of Mathematical and Computer Sciences.  
Supervised by Dr. Marta Vallejo.  
Motivated by work during an EPSRC-funded research internship on ALS imaging analysis.

The real-world ALS FUS pipeline used in evaluation was provided by a research collaborator. The underlying dataset is not included in this repository in accordance with data governance requirements.

---

## Licence

This project was developed as a university dissertation. Please contact the author for any use beyond academic review.
