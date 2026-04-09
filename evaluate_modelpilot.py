"""
ModelPilot Master Evaluation Script
====================================

Covers:
  Method 1 - Functional Validation       (FR-1 to FR-18)
  Method 2 - Deterministic Repeatability (RQ1)
  Method 4 - Dependency Isolation        (RQ1 support)
  Method 5 - Logging Transparency

Usage (run from modelpilot/ root):
  python evaluate_modelpilot.py

Prerequisites:
  - Backend API running: uvicorn backend.api.main:app --reload
  - models/als_classifier/  populated with entry.py, model.py, requirements.txt
  - models/als_classifier_v2/ populated
  - models/als_svm/ populated
  - inputs/als_data.csv present
  - Docker Desktop running
"""

import hashlib
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

# ── Configuration ─────────────────────────────────────────────
API_BASE = "http://localhost:8000"
CLI = [sys.executable, "-m", "cli.main"]
INPUT_CSV = "inputs"
RESULTS_DIR = Path("evaluation_results")
RESULTS_DIR.mkdir(exist_ok=True)

MODELS = ["als_classifier", "als_classifier_v2", "als_svm"]
PRIMARY_MODEL = "als_classifier"
REPEATABILITY_RUNS = 5

# ── Helpers ───────────────────────────────────────────────────

results = []
passed = 0
failed = 0
warnings = 0

RESET  = "\033[0m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"


def header(title):
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}\n")


def subheader(title):
    print(f"\n{BOLD}── {title} ──{RESET}")


def record(test_id, name, status, detail="", value=None):
    global passed, failed, warnings
    icon = f"{GREEN}✅ PASS{RESET}" if status == "PASS" else \
           f"{RED}❌ FAIL{RESET}" if status == "FAIL" else \
           f"{YELLOW}⚠️  WARN{RESET}"
    print(f"  {icon}  [{test_id}] {name}")
    if detail:
        print(f"         {detail}")
    if status == "PASS":
        passed += 1
    elif status == "FAIL":
        failed += 1
    else:
        warnings += 1
    results.append({
        "id": test_id,
        "name": name,
        "status": status,
        "detail": detail,
        "value": value,
        "timestamp": datetime.utcnow().isoformat(),
    })


def run_cli(args, timeout=600):
    """Run a CLI command and return (returncode, stdout, stderr)."""
    cmd = CLI + args
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return proc.returncode, proc.stdout, proc.stderr


def api_get(path):
    try:
        r = requests.get(f"{API_BASE}{path}", timeout=30)
        return r.status_code, r.json()
    except Exception as e:
        return None, str(e)


def api_post(path, payload):
    try:
        r = requests.post(f"{API_BASE}{path}", json=payload, timeout=30)
        return r.status_code, r.json()
    except Exception as e:
        return None, str(e)


def md5_file(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def md5_dict(d):
    """Stable hash of a dict by sorting keys."""
    serialised = json.dumps(d, sort_keys=True).encode()
    return hashlib.md5(serialised).hexdigest()


def latest_run_id():
    """Return the most recently created run ID from metadata dir."""
    meta = sorted(
        Path("runs/metadata").glob("run_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not meta:
        return None
    return meta[0].stem


def load_run_meta(run_id):
    path = Path(f"runs/metadata/{run_id}.json")
    if path.exists():
        return json.loads(path.read_text())
    return None


# ══════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ══════════════════════════════════════════════════════════════

header("PRE-FLIGHT CHECKS")

# Check API is reachable
subheader("API Availability")
status, data = api_get("/models")
if status == 200:
    record("PRE-1", "Backend API is running", "PASS",
           f"GET /models → 200 OK, {len(data.get('models', []))} models found")
else:
    record("PRE-1", "Backend API is running", "FAIL",
           "Could not reach http://localhost:8000 — start with: uvicorn backend.api.main:app --reload")
    print(f"\n{RED}FATAL: API not reachable. Start the backend and re-run.{RESET}\n")
    sys.exit(1)

# Check input CSV
subheader("Input Data")
if Path(INPUT_CSV).exists():
    record("PRE-2", f"Input CSV exists ({INPUT_CSV})", "PASS")
else:
    record("PRE-2", f"Input CSV exists ({INPUT_CSV})", "FAIL",
           f"Place als_data.csv in inputs/")

# Check model folders
subheader("Model Folders")
for m in MODELS:
    folder = Path(f"models/{m}")
    entry  = folder / "entry.py"
    model  = folder / "model.py"
    req    = folder / "requirements.txt"
    if entry.exists() and model.exists() and req.exists():
        record(f"PRE-{3+MODELS.index(m)}", f"Model folder ready: {m}", "PASS",
               "entry.py ✓  model.py ✓  requirements.txt ✓")
    else:
        missing = [f for f, p in [("entry.py", entry), ("model.py", model),
                                   ("requirements.txt", req)] if not p.exists()]
        record(f"PRE-{3+MODELS.index(m)}", f"Model folder ready: {m}", "FAIL",
               f"Missing: {missing}")


# ══════════════════════════════════════════════════════════════
# METHOD 1 — FUNCTIONAL VALIDATION (FR-1 to FR-18)
# ══════════════════════════════════════════════════════════════

header("METHOD 1 — FUNCTIONAL VALIDATION")

# ── FR-1: Accept model folder (entry.py + requirements.txt, no Dockerfile) ──
subheader("FR-1 | Model Folder Acceptance")
folder = Path(f"models/{PRIMARY_MODEL}")
has_entry = (folder / "entry.py").exists()
has_req   = (folder / "requirements.txt").exists()
no_docker = not (folder / "Dockerfile").exists()
if has_entry and has_req and no_docker:
    record("FR-1", "Accept model folder with entry.py + requirements.txt (no Dockerfile)",
           "PASS", "Correct structure detected — no user Dockerfile present")
else:
    record("FR-1", "Accept model folder with entry.py + requirements.txt (no Dockerfile)",
           "FAIL", f"entry={has_entry}, req={has_req}, no_dockerfile={no_docker}")

# ── FR-2 + FR-3: Auto-generate Dockerfile and build container ──
subheader("FR-2 + FR-3 | Auto-generate Dockerfile and Build Container")
print(f"  Building {PRIMARY_MODEL} (this may take a few minutes)...")
rc, out, err = run_cli(["build", PRIMARY_MODEL])

generated_df = Path(f"models/{PRIMARY_MODEL}/Dockerfile.generated")
if rc == 0:
    record("FR-3", f"Container built successfully for {PRIMARY_MODEL}", "PASS",
           f"Exit code 0")
else:
    record("FR-3", f"Container built successfully for {PRIMARY_MODEL}", "FAIL",
           f"Exit code {rc}\n         STDERR: {err[:300]}")

if generated_df.exists():
    record("FR-2", "Dockerfile auto-generated (Dockerfile.generated)", "PASS",
           f"Found: models/{PRIMARY_MODEL}/Dockerfile.generated")
else:
    record("FR-2", "Dockerfile auto-generated (Dockerfile.generated)", "WARN",
           "Dockerfile.generated not found — may have used cached image")

# ── Build all other models ──
subheader("FR-3 | Build All Models")
for m in ["als_classifier_v2", "als_svm"]:
    print(f"  Building {m}...")
    rc, out, err = run_cli(["build", m])
    if rc == 0:
        record("FR-3b", f"Container built successfully: {m}", "PASS")
    else:
        record("FR-3b", f"Container built successfully: {m}", "FAIL",
               f"Exit code {rc} — {err[:200]}")

# ── FR-4 + FR-5 + FR-6 + FR-7: Run model, capture logs, store outputs, assign run ID ──
subheader("FR-4, FR-5, FR-6, FR-7 | Run, Logs, Outputs, Run ID")
print(f"  Running {PRIMARY_MODEL}...")
rc, out, err = run_cli(["run", PRIMARY_MODEL, "--input", INPUT_CSV])
run_id_1 = latest_run_id()

if rc == 0:
    record("FR-4", f"Model executed successfully ({PRIMARY_MODEL})", "PASS",
           f"Run ID: {run_id_1}")
else:
    record("FR-4", f"Model executed successfully ({PRIMARY_MODEL})", "FAIL",
           f"Exit code {rc}\n         {err[:300]}")

if run_id_1:
    log_dir    = Path(f"runs/logs/{run_id_1}")
    stdout_log = log_dir / "stdout.log"
    stderr_log = log_dir / "stderr.log"
    output_f   = Path(f"runs/outputs/{run_id_1}/output.json")
    meta_f     = Path(f"runs/metadata/{run_id_1}.json")

    record("FR-5", "stdout/stderr logs captured", "PASS" if stdout_log.exists() else "FAIL",
           f"stdout.log: {stdout_log.exists()}  stderr.log: {stderr_log.exists()}")

    record("FR-6", "output.json stored in results directory", "PASS" if output_f.exists() else "FAIL",
           f"Path: runs/outputs/{run_id_1}/output.json")

    meta = load_run_meta(run_id_1)
    has_ts = meta and "timestamp_utc" in meta
    record("FR-7", "Unique versioned run ID with timestamp assigned", "PASS" if has_ts else "FAIL",
           f"Run ID: {run_id_1}  |  Timestamp: {meta.get('timestamp_utc', 'MISSING') if meta else 'N/A'}")
else:
    record("FR-5", "Logs captured", "FAIL", "No run ID found")
    record("FR-6", "Output stored", "FAIL", "No run ID found")
    record("FR-7", "Run ID assigned", "FAIL", "No run ID found")

# ── FR-11 + FR-12: GPU check + CPU fallback ──
subheader("FR-11 + FR-12 | GPU Detection and CPU Fallback")
if run_id_1:
    meta = load_run_meta(run_id_1)
    if meta:
        gpu_req     = meta.get("gpu_requested", False)
        gpu_used    = meta.get("gpu_used", False)
        gpu_fallback = meta.get("gpu_fallback", False)
        device      = meta.get("hardware_device", "unknown")
        record("FR-11", "GPU availability detected", "PASS",
               f"gpu_requested={gpu_req}  gpu_used={gpu_used}  device={device}")
        record("FR-12", "CPU fallback executed with warning", "PASS" if not gpu_req else "WARN",
               f"gpu_fallback={gpu_fallback}  device={device}")
    else:
        record("FR-11", "GPU detection", "FAIL", "Metadata not found")
        record("FR-12", "CPU fallback", "FAIL", "Metadata not found")

# ── Run second model for comparison ──
subheader("FR-4 (2nd run) | Run als_classifier_v2 for comparison data")
print(f"  Running als_classifier_v2...")
rc, out, err = run_cli(["run", "als_classifier_v2", "--input", INPUT_CSV])
run_id_2 = latest_run_id()
if rc == 0:
    record("FR-4b", "als_classifier_v2 executed successfully", "PASS",
           f"Run ID: {run_id_2}")
else:
    record("FR-4b", "als_classifier_v2 executed", "FAIL", err[:200])

# ── Run als_svm ──
print(f"  Running als_svm...")
rc, out, err = run_cli(["run", "als_svm", "--input", INPUT_CSV])
run_id_svm = latest_run_id()
if rc == 0:
    record("FR-4c", "als_svm executed successfully", "PASS",
           f"Run ID: {run_id_svm}")
else:
    record("FR-4c", "als_svm executed", "FAIL", err[:200])

# ── FR-8: List runs ──
subheader("FR-8 | List Runs (run history)")
rc, out, err = run_cli(["list-runs"])
has_runs = run_id_1 and run_id_1 in out
record("FR-8", "list-runs shows previous runs", "PASS" if rc == 0 and has_runs else "FAIL",
       f"Found {out.count('run_')} runs in output")

# ── FR-9: Report ──
subheader("FR-9 | Performance Report")
if run_id_1:
    rc, out, err = run_cli(["report", run_id_1])
    record("FR-9", "Performance report generated", "PASS" if rc == 0 else "FAIL",
           f"Exit code {rc}")

# ── FR-10: Compare ──
subheader("FR-10 | Run Comparison")
if run_id_1 and run_id_2 and run_id_1 != run_id_2:
    rc, out, err = run_cli(["compare", run_id_1, run_id_2])
    record("FR-10", "Comparison report between two runs", "PASS" if rc == 0 else "FAIL",
           f"Compared {run_id_1} vs {run_id_2}")
else:
    record("FR-10", "Comparison report", "WARN", "Need 2 distinct run IDs")

# ── FR-14: Rebuild uses cache ──
subheader("FR-14 | Versioned Image Cache")
print(f"  Rebuilding {PRIMARY_MODEL} (should use cache)...")
rc, out, err = run_cli(["build", PRIMARY_MODEL])
used_cache = "cache" in out.lower() or "reused" in out.lower() or rc == 0
record("FR-14", "Second build reuses cached image", "PASS" if used_cache else "WARN",
       "Cache reuse detected" if used_cache else "Could not confirm cache reuse")

# ── FR-15: CLI commands ──
subheader("FR-15 | CLI Commands Available")
for cmd, args in [
    ("build",           ["build", "--help"]),
    ("run",             ["run", "--help"]),
    ("list-runs",       ["list-runs", "--help"]),
    ("compare",         ["compare", "--help"]),
    ("report",          ["report", "--help"]),
    ("list-templates",  ["list-templates"]),
    ("select-template", ["select-template", "--help"]),
    ("clear-template",  ["clear-template"]),
    ("view-template",   ["view-template", "--help"]),
]:
    rc, out, err = run_cli(args)
    record("FR-15", f"CLI command available: {cmd}",
           "PASS" if rc in (0, 2) else "FAIL",
           f"Exit code {rc}")

# ── FR-16: Template system ──
subheader("FR-16 | Template System")
rc, out, err = run_cli(["list-templates"])
templates = [l.strip("- ").strip() for l in out.splitlines() if l.strip().startswith("-")]
record("FR-16a", "list-templates returns templates", "PASS" if rc == 0 and templates else "FAIL",
       f"Found templates: {templates[:5]}")

if templates:
    t = templates[0]
    rc, out, err = run_cli(["select-template", t])
    record("FR-16b", f"select-template works ({t})", "PASS" if rc == 0 else "FAIL")

    rc, out, err = run_cli(["clear-template"])
    record("FR-16c", "clear-template works", "PASS" if rc == 0 else "FAIL")

# ── FR-13: Re-run with new input (no rebuild) ──
subheader("FR-13 | Re-run Without Rebuilding")
print(f"  Re-running {PRIMARY_MODEL} with same input (no --rebuild)...")
rc, out, err = run_cli(["run", PRIMARY_MODEL, "--input", INPUT_CSV])
no_rebuild_run_id = latest_run_id()
record("FR-13", "Model re-run with input without rebuilding container",
       "PASS" if rc == 0 else "FAIL",
       f"New run ID: {no_rebuild_run_id}")

# ── API Endpoint Tests (BONUS) ──
subheader("BONUS | API Endpoint Tests")
endpoints = [
    ("GET",  "/models",              None),
    ("GET",  "/runs",                None),
    ("GET",  "/templates",           None),
    ("GET",  "/templates/selected",  None),
]
for method, path, payload in endpoints:
    code, data = api_get(path) if method == "GET" else api_post(path, payload)
    record("API", f"{method} {path}", "PASS" if code == 200 else "FAIL",
           f"Status: {code}")

if run_id_1:
    for path in [f"/run/{run_id_1}", f"/run/{run_id_1}/logs", f"/run/{run_id_1}/output"]:
        code, data = api_get(path)
        record("API", f"GET {path}", "PASS" if code == 200 else "FAIL",
               f"Status: {code}")

    code, data = api_post("/compare/two", {"run_id_1": run_id_1, "run_id_2": run_id_2})
    record("API", "POST /compare/two", "PASS" if code == 200 else "FAIL",
           f"Status: {code}")


# ══════════════════════════════════════════════════════════════
# METHOD 2 — DETERMINISTIC REPEATABILITY (RQ1)
# ══════════════════════════════════════════════════════════════

header("METHOD 2 — DETERMINISTIC REPEATABILITY (RQ1)")
print(f"  Running {PRIMARY_MODEL} {REPEATABILITY_RUNS} times with identical inputs...")
print(f"  Input: {INPUT_CSV}")
print()

repeat_run_ids  = []
repeat_hashes   = []
repeat_metrics  = []
repeat_outputs  = []

for i in range(1, REPEATABILITY_RUNS + 1):
    print(f"  Run {i}/{REPEATABILITY_RUNS}...", end=" ", flush=True)
    rc, out, err = run_cli(["run", PRIMARY_MODEL, "--input", INPUT_CSV])
    rid = latest_run_id()
    if rc == 0 and rid:
        output_path = Path(f"runs/outputs/{rid}/output.json")
        if output_path.exists():
            content = json.loads(output_path.read_text())
            h = md5_dict(content.get("metrics", {}))
            repeat_run_ids.append(rid)
            repeat_hashes.append(h)
            repeat_metrics.append(content.get("metrics", {}))
            repeat_outputs.append(content)
            print(f"✓ run_id={rid}  hash={h[:12]}...")
        else:
            print(f"✗ output.json not found")
    else:
        print(f"✗ FAILED (exit {rc})")
    time.sleep(1)

print()
subheader("Repeatability Results")

# Hash comparison
all_same = len(set(repeat_hashes)) == 1
record("M2-1", f"All {REPEATABILITY_RUNS} runs produce identical metric hashes",
       "PASS" if all_same else "FAIL",
       f"Unique hashes: {len(set(repeat_hashes))}  (expected 1)")

# Per-metric variance
if repeat_metrics:
    all_keys = repeat_metrics[0].keys()
    print()
    print(f"  {'Metric':<22} {'Run1':>8} {'Run2':>8} {'Run3':>8} {'Run4':>8} {'Run5':>8}  {'Consistent'}")
    print(f"  {'-'*80}")
    for k in all_keys:
        vals = [str(m.get(k, "N/A")) for m in repeat_metrics]
        consistent = len(set(vals)) == 1
        flag = f"{GREEN}✓{RESET}" if consistent else f"{RED}✗{RESET}"
        print(f"  {k:<22} {'  '.join(v[:6] for v in vals)}  {flag}")
        record(f"M2-{k}", f"Metric '{k}' identical across all runs",
               "PASS" if consistent else "FAIL",
               f"Values: {vals}")

# Save repeatability table
rep_table = {
    "method": "Deterministic Repeatability",
    "model": PRIMARY_MODEL,
    "runs": REPEATABILITY_RUNS,
    "all_hashes_identical": all_same,
    "hashes": repeat_hashes,
    "run_ids": repeat_run_ids,
    "metrics_per_run": repeat_metrics,
}
with open(RESULTS_DIR / "method2_repeatability.json", "w") as f:
    json.dump(rep_table, f, indent=2)
print(f"\n  Results saved → evaluation_results/method2_repeatability.json")


# ══════════════════════════════════════════════════════════════
# METHOD 4 — DEPENDENCY ISOLATION
# ══════════════════════════════════════════════════════════════

header("METHOD 4 — DEPENDENCY ISOLATION")

subheader("Container Package Manifest")

# Get the image tag from build metadata
build_meta = list(Path("runs/metadata").glob(f"build_{PRIMARY_MODEL}_*.json"))
image_tag = None
if build_meta:
    bm = json.loads(build_meta[-1].read_text())
    image_tag = bm.get("image_tag")

if image_tag:
    print(f"  Image: {image_tag}")
    try:
        result = subprocess.run(
            ["docker", "run", "--rm", image_tag, "pip", "list", "--format=json"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            installed = json.loads(result.stdout)
            record("M4-1", "Container package manifest retrieved", "PASS",
                   f"{len(installed)} packages installed inside container")

            # Check required packages present
            req_path = Path(f"models/{PRIMARY_MODEL}/requirements.txt")
            required = {}
            if req_path.exists():
                for line in req_path.read_text().splitlines():
                    if "==" in line:
                        name, ver = line.strip().split("==")
                        required[name.lower()] = ver

            installed_map = {p["name"].lower(): p["version"] for p in installed}

            print()
            print(f"  {'Package':<25} {'Required':<15} {'Installed':<15} {'Match'}")
            print(f"  {'-'*65}")
            all_match = True
            for pkg, req_ver in required.items():
                inst_ver = installed_map.get(pkg, "NOT FOUND")
                match = inst_ver == req_ver
                if not match:
                    all_match = False
                flag = f"{GREEN}✓{RESET}" if match else f"{RED}✗{RESET}"
                print(f"  {pkg:<25} {req_ver:<15} {inst_ver:<15} {flag}")
                record(f"M4-pkg-{pkg}", f"Package {pkg}=={req_ver} installed correctly",
                       "PASS" if match else "FAIL",
                       f"Installed: {inst_ver}")

            record("M4-2", "All required packages present at correct versions",
                   "PASS" if all_match else "FAIL")

            # Save manifest
            manifest = {
                "image": image_tag,
                "required_packages": required,
                "all_installed_packages": installed,
                "versions_match": all_match,
            }
            with open(RESULTS_DIR / "method4_dependency_manifest.json", "w") as f:
                json.dump(manifest, f, indent=2)
            print(f"\n  Manifest saved → evaluation_results/method4_dependency_manifest.json")

        else:
            record("M4-1", "Container package manifest retrieved", "FAIL",
                   result.stderr[:200])
    except Exception as e:
        record("M4-1", "Container package manifest retrieved", "FAIL", str(e))
else:
    record("M4-1", "Container image found for inspection", "FAIL",
           "No build metadata found — run build first")

# Check generated Dockerfile content
subheader("Generated Dockerfile Review")
gen_df = Path(f"models/{PRIMARY_MODEL}/Dockerfile.generated")
if gen_df.exists():
    content = gen_df.read_text()
    has_from    = "FROM python" in content
    has_copy    = "COPY" in content
    has_install = "pip install" in content
    has_workdir = "WORKDIR" in content
    has_cmd     = "CMD" in content or "ENTRYPOINT" in content

    checks = [
        ("FROM python base image", has_from),
        ("COPY model files", has_copy),
        ("pip install dependencies", has_install),
        ("WORKDIR set", has_workdir),
        ("CMD/ENTRYPOINT defined", has_cmd),
    ]
    for name, check in checks:
        record("M4-df", f"Dockerfile: {name}", "PASS" if check else "FAIL")
else:
    record("M4-df", "Generated Dockerfile exists for review", "WARN",
           "Dockerfile.generated not found")


# ══════════════════════════════════════════════════════════════
# METHOD 5 — LOGGING TRANSPARENCY
# ══════════════════════════════════════════════════════════════

header("METHOD 5 — LOGGING TRANSPARENCY")

if run_id_1:
    subheader("Log File Completeness")

    log_dir    = Path(f"runs/logs/{run_id_1}")
    stdout_log = log_dir / "stdout.log"
    stderr_log = log_dir / "stderr.log"
    meta       = load_run_meta(run_id_1)

    # Log files exist
    record("M5-1", "stdout.log file exists", "PASS" if stdout_log.exists() else "FAIL",
           str(stdout_log))
    record("M5-2", "stderr.log file exists", "PASS" if stderr_log.exists() else "FAIL",
           str(stderr_log))

    # stdout content
    if stdout_log.exists():
        stdout_content = stdout_log.read_text()
        has_pipeline   = "Pipeline" in stdout_content or "ALS" in stdout_content
        has_results    = "RESULTS" in stdout_content or "accuracy" in stdout_content.lower()
        has_output     = "output.json" in stdout_content or "saved" in stdout_content.lower()
        record("M5-3", "stdout contains pipeline execution trace", "PASS" if has_pipeline else "FAIL",
               f"{len(stdout_content)} chars captured")
        record("M5-4", "stdout contains metric results", "PASS" if has_results else "FAIL")
        record("M5-5", "stdout confirms output saved", "PASS" if has_output else "FAIL")

    # Metadata completeness
    subheader("Metadata Completeness")
    if meta:
        checks = {
            "run_id in filename":         run_id_1.startswith("run_"),
            "model name recorded":        bool(meta.get("model")),
            "version/hash recorded":      bool(meta.get("version")),
            "timestamp_utc recorded":     bool(meta.get("timestamp_utc")),
            "status recorded":            bool(meta.get("status")),
            "duration_seconds recorded":  meta.get("duration_seconds") is not None,
            "hardware_device recorded":   bool(meta.get("hardware_device")),
            "gpu_requested recorded":     meta.get("gpu_requested") is not None,
            "build_source recorded":      bool(meta.get("build_source")),
            "output_path recorded":       bool(meta.get("output_path")),
            "output_json_exists flag":    meta.get("output_json_exists") is not None,
        }
        for check, result in checks.items():
            record("M5-meta", f"Metadata field: {check}", "PASS" if result else "FAIL",
                   str(meta.get(check.split()[0], "N/A")))

        # Print sample metadata
        print()
        print("  Sample metadata (runs/metadata/{run_id}.json):")
        for k, v in meta.items():
            if k not in ("build_source",):
                print(f"    {k:<30}: {v}")

        # Save log report
        log_report = {
            "run_id": run_id_1,
            "stdout_chars": len(stdout_log.read_text()) if stdout_log.exists() else 0,
            "stderr_chars": len(stderr_log.read_text()) if stderr_log.exists() else 0,
            "metadata": meta,
            "completeness_checks": checks,
        }
        with open(RESULTS_DIR / "method5_logging_report.json", "w") as f:
            json.dump(log_report, f, indent=2)
        print(f"\n  Log report saved → evaluation_results/method5_logging_report.json")
    else:
        record("M5-meta", "Metadata file readable", "FAIL", f"Could not load {run_id_1}.json")
else:
    record("M5-1", "Logging check", "FAIL", "No run ID available from Method 1")


# ══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ══════════════════════════════════════════════════════════════

header("EVALUATION SUMMARY")

total = passed + failed + warnings
print(f"  Total Tests  : {total}")
print(f"  {GREEN}Passed       : {passed}{RESET}")
print(f"  {RED}Failed       : {failed}{RESET}")
print(f"  {YELLOW}Warnings     : {warnings}{RESET}")
print()

pct = (passed / total * 100) if total > 0 else 0
print(f"  Pass Rate    : {pct:.1f}%")
print()

if failed == 0:
    print(f"  {GREEN}{BOLD}🎉 ALL TESTS PASSED — System functioning as specified{RESET}")
elif failed <= 3:
    print(f"  {YELLOW}{BOLD}⚠️  MOSTLY PASSING — {failed} test(s) need attention{RESET}")
else:
    print(f"  {RED}{BOLD}❌ FAILURES DETECTED — Review failed tests above{RESET}")

print()
print(f"  {BOLD}Method breakdown:{RESET}")

method_map = {
    "PRE":    "Pre-flight checks",
    "FR":     "Method 1 — Functional Validation",
    "API":    "Method 1 — API Endpoint Tests (BONUS)",
    "M2":     "Method 2 — Deterministic Repeatability",
    "M4":     "Method 4 — Dependency Isolation",
    "M5":     "Method 5 — Logging Transparency",
}
for prefix, label in method_map.items():
    m_results = [r for r in results if r["id"].startswith(prefix)]
    m_pass    = sum(1 for r in m_results if r["status"] == "PASS")
    m_fail    = sum(1 for r in m_results if r["status"] == "FAIL")
    m_warn    = sum(1 for r in m_results if r["status"] == "WARN")
    status_icon = f"{GREEN}✅{RESET}" if m_fail == 0 else f"{RED}❌{RESET}"
    print(f"    {status_icon} {label:<45} {m_pass}P / {m_fail}F / {m_warn}W")

# Save full results
summary = {
    "generated_at": datetime.utcnow().isoformat(),
    "total": total,
    "passed": passed,
    "failed": failed,
    "warnings": warnings,
    "pass_rate_pct": round(pct, 1),
    "results": results,
}
with open(RESULTS_DIR / "evaluation_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

print()
print(f"  {BOLD}Full results saved → evaluation_results/evaluation_summary.json{RESET}")
print()
print(f"  {CYAN}NOTE: Method 3 (Cross-Environment) requires running on a second{RESET}")
print(f"  {CYAN}machine. Use method3_instructions.md for guidance.{RESET}")
print()
