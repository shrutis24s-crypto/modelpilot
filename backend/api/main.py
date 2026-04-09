from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import json
from typing import List

from backend.modelpilot.evaluator import evaluate_run, generate_insights
from backend.modelpilot.registry import resolve_model, list_models
from backend.modelpilot.builder import build_image
from backend.modelpilot.runner import run_image
from backend.modelpilot.reporting import (
    get_related_runs,
    generate_run_report,
    generate_comparison_report,
    generate_same_model_comparison,  # keep only if it exists
)
from backend.modelpilot.templates import list_templates, load_template
from backend.modelpilot.config import set_selected_template, get_selected_template, clear_selected_template

app = FastAPI(title="ModelPilot API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
RUNS_DIR = Path("runs")
OUTPUTS_DIR = RUNS_DIR / "outputs"
METADATA_DIR = RUNS_DIR / "metadata"


# =========================
# REQUEST MODELS
# =========================

class RunRequest(BaseModel):
    model: str
    use_gpu: bool = Field(default=False)
    timeout: int = Field(default=600, ge=1)
    input_path: str | None = None


class CompareRequest(BaseModel):
    run_ids: List[str]


class TemplateSelectRequest(BaseModel):
    name: str


# =========================
# UTILITY FUNCTIONS
# =========================

def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_metadata(run_id: str):
    path = METADATA_DIR / f"{run_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    return load_json(path)


# =========================
# TEMPLATE ENDPOINTS
# =========================

@app.get("/templates")
def get_templates():
    return {"templates": list_templates()}


@app.get("/templates/selected")
def get_selected_template_endpoint():
    return {"selected_template": get_selected_template()}


@app.get("/templates/{name}")
def get_template(name: str):
    try:
        content = load_template(name)
        return {
            "name": name,
            "dockerfile": content
        }
    except Exception:
        raise HTTPException(status_code=404, detail="Template not found")


@app.post("/templates/select")
def select_template(req: TemplateSelectRequest):
    try:
        available = set(list_templates())
        if req.name not in available:
            raise HTTPException(status_code=404, detail="Template not found")

        set_selected_template(req.name)
        return {
            "message": f"Template '{req.name}' selected",
            "selected_template": req.name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# RUN MODEL
# =========================

@app.post("/run")
def run_model(req: RunRequest):
    try:
        # Step 1: Resolve model
        spec = resolve_model(req.model)

        # Step 2: Build image (FIXED: now captures build_source)
        image_tag, version, build_source = build_image(spec)

        # Step 3: Run container (FIXED: pass build_source)
        run_id = run_image(
            image_tag=image_tag,
            model_name=req.model,
            version=version,
            use_gpu=req.use_gpu,
            timeout_seconds=req.timeout,
            input_path=req.input_path,
            build_source=build_source,
        )

        # Step 4: Load metadata
        meta = get_metadata(run_id)

        # Step 5: Evaluate if output exists
        evaluation = None
        output_file = OUTPUTS_DIR / run_id / "output.json"

        if output_file.exists():
            evaluation = evaluate_run(str(output_file), als_mode=True)

        return {
            "run_id": run_id,
            "model": meta.get("model"),
            "version": meta.get("version"),
            "status": meta.get("status"),
            "duration": meta.get("duration_seconds"),
            "device": meta.get("hardware_device"),
            "input_path": meta.get("input_path"),
            "output_path": meta.get("output_path"),
            "output_json_exists": meta.get("output_json_exists"),
            "gpu_requested": meta.get("gpu_requested"),
            "gpu_used": meta.get("gpu_used"),
            "gpu_fallback": meta.get("gpu_fallback"),
            "warning": meta.get("warning"),
            "error": meta.get("error"),
            "evaluation": evaluation,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# RUN LISTING
# =========================

@app.get("/runs")
def list_runs():
    if not METADATA_DIR.exists():
        return {"runs": []}

    runs = []

    for file in METADATA_DIR.glob("run_*.json"):
        try:
            meta = load_json(file)
            runs.append({
                "run_id": file.stem,
                "model": meta.get("model"),
                "version": meta.get("version"),
                "status": meta.get("status"),
                "duration_seconds": meta.get("duration_seconds"),
                "device": meta.get("hardware_device"),
                "input_path": meta.get("input_path"),
                "output_json_exists": meta.get("output_json_exists"),
                "timestamp_utc": meta.get("timestamp_utc"),
            })
        except Exception:
            continue

    return {"runs": runs}


@app.get("/run/{run_id}")
def run_details(run_id: str):
    return get_metadata(run_id)


@app.get("/run/{run_id}/related")
def related_runs_endpoint(run_id: str):
    try:
        related = get_related_runs(run_id)
        return {"related_runs": related}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")


# =========================
# REPORTING
# =========================

@app.get("/report/{run_id}")
def report(run_id: str):
    meta = get_metadata(run_id)

    if meta.get("status") not in {"completed", "incomplete"}:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Run did not complete successfully enough to evaluate",
                "status": meta.get("status"),
                "error": meta.get("error"),
            },
        )

    output_file = OUTPUTS_DIR / run_id / "output.json"

    if not output_file.exists():
        raise HTTPException(status_code=404, detail="No output.json found")

    result = evaluate_run(str(output_file), als_mode=True)
    return result


@app.post("/report/{run_id}/visual")
def visual_report(run_id: str):
    try:
        report_data = generate_run_report(run_id, als_mode=True)
        return report_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# COMPARISON
# =========================

@app.post("/compare")
def compare_runs(req: CompareRequest):
    if len(req.run_ids) < 2:
        raise HTTPException(status_code=400, detail="At least two runs required")

    try:
        report = generate_comparison_report(req.run_ids, als_mode=True)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare/same-model")
def compare_same_model(run_id: str):
    try:
        result = generate_same_model_comparison(run_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# =========================
# LIST MODELS
# =========================

@app.get("/models")
def list_models_endpoint():
    try:
        models = list_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# BUILD ONLY
# =========================

class BuildRequest(BaseModel):
    model: str
    template: str | None = None
    rebuild: bool = False

@app.post("/build")
def build_model(req: BuildRequest):
    try:
        if req.template:
            available = set(list_templates())
            if req.template not in available:
                raise HTTPException(status_code=404, detail="Template not found")
            set_selected_template(req.template)

        spec = resolve_model(req.model)
        image_tag, version, build_source = build_image(spec, force_rebuild=req.rebuild)

        return {
            "model": req.model,
            "image_tag": image_tag,
            "version": version,
            "build_source": build_source,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# CLEAR TEMPLATE
# =========================

@app.delete("/templates/selected")
def clear_selected_template():
    try:
        from backend.modelpilot.config import clear_selected_template
        clear_selected_template()
        return {"message": "Template cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# GET LOGS
# =========================

@app.get("/run/{run_id}/logs")
def get_logs(run_id: str):
    log_dir = RUNS_DIR / "logs" / run_id
    
    stdout_path = log_dir / "stdout.log"
    stderr_path = log_dir / "stderr.log"

    if not stdout_path.exists() and not stderr_path.exists():
        raise HTTPException(status_code=404, detail="Logs not found")

    return {
        "run_id": run_id,
        "stdout": stdout_path.read_text(encoding="utf-8") if stdout_path.exists() else "",
        "stderr": stderr_path.read_text(encoding="utf-8") if stderr_path.exists() else "",
    }


# =========================
# GET OUTPUT
# =========================

@app.get("/run/{run_id}/output")
def get_output(run_id: str):
    output_path = OUTPUTS_DIR / run_id / "output.json"

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="No output.json found for this run")

    return load_json(output_path)


# =========================
# SIMPLE COMPARE (two runs with insights)
# =========================

class SimpleTwoRunCompareRequest(BaseModel):
    run_id_1: str
    run_id_2: str

@app.post("/compare/two")
def compare_two(req: SimpleTwoRunCompareRequest):
    try:
        f1 = OUTPUTS_DIR / req.run_id_1 / "output.json"
        f2 = OUTPUTS_DIR / req.run_id_2 / "output.json"

        if not f1.exists():
            raise HTTPException(status_code=404, detail=f"Output not found for {req.run_id_1}")
        if not f2.exists():
            raise HTTPException(status_code=404, detail=f"Output not found for {req.run_id_2}")

        r1 = evaluate_run(str(f1), als_mode=True)
        r2 = evaluate_run(str(f2), als_mode=True)

        diffs = {}
        for m in r1.get("metrics", {}):
            if m in r2.get("metrics", {}):
                diffs[m] = round(r1["metrics"][m] - r2["metrics"][m], 4)

        insights = generate_insights(r1, r2, als_mode=True)

        return {
            "run_id_1": req.run_id_1,
            "run_id_2": req.run_id_2,
            "metrics_run_1": r1.get("metrics", {}),
            "metrics_run_2": r2.get("metrics", {}),
            "score_1": r1.get("score") or 0.0,
            "score_2": r2.get("score") or 0.0,
            "differences": diffs,
            "insights": insights,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))