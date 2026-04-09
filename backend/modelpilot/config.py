from pathlib import Path
import json

# Project root (modelpilot folder)
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Core directories
MODELS_DIR = PROJECT_ROOT / "models"
INPUTS_DIR = PROJECT_ROOT / "inputs"

RUNS_DIR = PROJECT_ROOT / "runs"
RUNS_LOGS_DIR = RUNS_DIR / "logs"
RUNS_OUTPUTS_DIR = RUNS_DIR / "outputs"
RUNS_METADATA_DIR = RUNS_DIR / "metadata"
RUNS_REPORTS_DIR = RUNS_DIR / "reports"

# Runtime defaults
DEFAULT_RUN_TIMEOUT_SECONDS = 600  # 10 minutes
DEFAULT_BUILD_BASE_IMAGE = "python:3.10"
DEFAULT_CONTAINER_INPUT_DIR = "/app/input"
DEFAULT_CONTAINER_OUTPUT_DIR = "/app/output"

# Image naming
IMAGE_NAME_PREFIX = "modelpilot"

# -------------------------
# NEW: Template Config Storage
# -------------------------
CONFIG_FILE = PROJECT_ROOT / ".modelpilot_config.json"


def set_selected_template(name: str):
    data = {}
    if CONFIG_FILE.exists():
        data = json.loads(CONFIG_FILE.read_text())

    data["selected_template"] = name
    CONFIG_FILE.write_text(json.dumps(data, indent=2))


def get_selected_template():
    if not CONFIG_FILE.exists():
        return None

    data = json.loads(CONFIG_FILE.read_text())
    return data.get("selected_template")


def clear_selected_template():
    if not CONFIG_FILE.exists():
        return

    data = json.loads(CONFIG_FILE.read_text())
    data.pop("selected_template", None)
    CONFIG_FILE.write_text(json.dumps(data, indent=2))


# -------------------------
# Ensure dirs
# -------------------------
def ensure_dirs() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    INPUTS_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_LOGS_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_METADATA_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_REPORTS_DIR.mkdir(parents=True, exist_ok=True)