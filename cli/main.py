import json
from pathlib import Path
from typing import Optional

import typer

from backend.modelpilot.templates import list_templates, load_template
from backend.modelpilot.config import (
    set_selected_template,
    RUNS_OUTPUTS_DIR,
    RUNS_METADATA_DIR,
    RUNS_LOGS_DIR,
    DEFAULT_RUN_TIMEOUT_SECONDS,
)
from backend.modelpilot.registry import resolve_model, list_models
from backend.modelpilot.builder import build_image
from backend.modelpilot.runner import run_image
from backend.modelpilot.evaluator import evaluate_run, generate_insights
from backend.modelpilot.reporting import (
    generate_run_report,
    generate_comparison_report,
    generate_same_model_comparison,
)

app = typer.Typer(
    help="ModelPilot CLI — build, run, and compare ML models in isolated containers"
)


def _load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _error(msg):
    typer.secho(f"Error: {msg}", fg=typer.colors.RED)


def _warn(msg):
    typer.secho(f"Warning: {msg}", fg=typer.colors.YELLOW)


def _ok(msg):
    typer.secho(msg, fg=typer.colors.GREEN)


def _section(title):
    typer.echo("\n" + "=" * 30)
    typer.echo(title)
    typer.echo("=" * 30)


def _get_meta(run_id):
    path = RUNS_METADATA_DIR / f"{run_id}.json"
    if not path.exists():
        raise FileNotFoundError("Run not found")
    return _load_json(path)


# =========================
# MODELS
# =========================

@app.command("list-models")
def cli_list_models():
    models = list_models()
    if not models:
        typer.echo("No models found.")
        return
    for m in models:
        typer.echo(f"- {m}")


# =========================
# BUILD
# =========================

@app.command()
def build(
    model: str,
    template: Optional[str] = typer.Option(None, "--template"),
    rebuild: bool = typer.Option(False, "--rebuild"),
):
    from docker.errors import BuildError
    try:
        if template:
            available = list_templates()
            if template not in available:
                _error(f"Template not found. Available: {available}")
                raise typer.Exit(1)
            set_selected_template(template)

        spec = resolve_model(model)
        image, version, build_source = build_image(spec, force_rebuild=rebuild)

        _section("BUILD SUMMARY")
        typer.echo(f"Model   : {model}")
        typer.echo(f"Version : {version}")
        typer.echo(f"Image   : {image}")

        if build_source.get("template"):
            typer.echo(f"Source  : TEMPLATE ({build_source['template']})")
        elif build_source.get("generated"):
            typer.echo("Source  : GENERATED (requirements.txt)")
        else:
            typer.echo("Source  : USER DOCKERFILE")

        typer.echo(f"Dockerfile : {build_source.get('dockerfile')}")

        if rebuild:
            typer.echo("Rebuild : forced")

    
    except BuildError as e:
        _section("BUILD FAILED")

        # determine source
        if build_source.get("generated"):
            typer.echo("Dependency installation failed (requirements.txt issue).\n")
        elif build_source.get("template"):
            typer.echo(f"Template build failed ({build_source['template']}).\n")
        else:
            typer.echo("Dockerfile build failed (user-defined Dockerfile).\n")

        # print actual docker error
        for chunk in e.build_log:
            if isinstance(chunk, dict) and "stream" in chunk:
                line = chunk["stream"]
                if "ERROR" in line or "error" in line:
                    typer.echo(line.strip())

        raise typer.Exit(1)

    # =========================
    # OTHER ERRORS
    # =========================
    except Exception as e:
        msg = str(e)

        if "entry.py" in msg:
            _section("VALIDATION FAILED")
            _error(msg)
        else:
            _section("ERROR")
            _error(msg)

        raise typer.Exit(1)
    

        

# =========================
# RUN
# =========================

@app.command()
def run(
    model: str,
    gpu: bool = typer.Option(False, "--gpu"),
    timeout: int = typer.Option(DEFAULT_RUN_TIMEOUT_SECONDS, "--timeout"),
    input_path: Optional[str] = typer.Option(None, "--input"),
    rebuild: bool = typer.Option(False, "--rebuild"),
):
    from docker.errors import BuildError

    build_source = {}  

    try:
        spec = resolve_model(model)

        image, version, build_source = build_image(
            spec, force_rebuild=rebuild
        )

        run_id = run_image(
            image_tag=image,
            model_name=model,
            version=version,
            use_gpu=gpu,
            timeout_seconds=timeout,
            input_path=input_path,
            build_source=build_source,
        )

        meta = _get_meta(run_id)

        # =========================
        # RUN SUMMARY
        # =========================
        _section("RUN SUMMARY")
        typer.echo(f"Run ID  : {run_id}")
        typer.echo(f"Model   : {meta.get('model')}")
        typer.echo(f"Version : {meta.get('version')}")
        typer.echo(f"Status  : {meta.get('status')}")
        typer.echo(f"Time    : {meta.get('duration_seconds')}s")
        typer.echo(f"Input   : {meta.get('input_path')}")

        if rebuild:
            typer.echo("Rebuild : forced")

        build = meta.get("build_source", {})

        # =========================
        # BUILD INFO
        # =========================
        _section("BUILD INFO")

        if build.get("template"):
            typer.echo(f"Source      : TEMPLATE ({build['template']})")
        elif build.get("generated"):
            typer.echo("Source      : GENERATED (requirements.txt)")
        else:
            typer.echo("Source      : USER DOCKERFILE")

        typer.echo(f"Dockerfile  : {build.get('dockerfile')}")

        device = meta.get("hardware_device")
        if meta.get("gpu_fallback"):
            device = f"{device} (fallback)"
        typer.echo(f"Device      : {device}")

        if meta.get("warning"):
            _warn(meta["warning"])

        # =========================
        # EVALUATION (ONLY IF SUCCESS)
        # =========================
        output = RUNS_OUTPUTS_DIR / run_id / "output.json"

        if meta.get("status") == "completed":
            _section("EVALUATION")

            if output.exists():
                result = evaluate_run(str(output), als_mode=True)

                typer.echo(f"Task Type : {result.get('task_type')}")
                typer.echo(f"Score     : {result.get('score')}")

                for k, v in result.get("metrics", {}).items():
                    typer.echo(f"{k}: {v}")

                for w in result.get("warnings", []):
                    _warn(w)
            else:
                _warn("No output.json produced by model")

        # =========================
        # RUN FAILED (AFTER SUMMARY)
        # =========================
        if meta.get("status") == "failed":
            _section("RUN FAILED")

            log_dir = RUNS_LOGS_DIR / run_id
            stdout_path = log_dir / "stdout.log"
            stderr_path = log_dir / "stderr.log"

            stderr_text = ""

            if stdout_path.exists():
                typer.echo("\n--- STDOUT ---\n")
                typer.echo(stdout_path.read_text())

            if stderr_path.exists():
                stderr_text = stderr_path.read_text()
                typer.echo("\n--- STDERR ---\n")
                typer.echo(stderr_text)

            # print error AFTER logs
            if meta.get("error"):
                _error(meta["error"])

            # smart hint
            if "ModuleNotFoundError" in stderr_text:
                _warn("Possible dependency issue detected.")
                if build.get("generated"):
                    _warn("Check your requirements.txt — missing dependency.")
                else:
                    _warn("Check your Dockerfile — dependency may not be installed.")

            raise typer.Exit(1)  

    # =========================
    # BUILD ERROR
    # =========================
    except BuildError as e:
        _section("BUILD FAILED")

        if build_source.get("generated"):
            typer.echo("Dependency installation failed (requirements.txt issue).\n")
        elif build_source.get("template"):
            typer.echo(f"Template build failed ({build_source.get('template')}).\n")
        else:
            typer.echo("Dockerfile build failed (user-defined Dockerfile).\n")

        for chunk in e.build_log:
            if isinstance(chunk, dict) and "stream" in chunk:
                line = chunk["stream"]
                if "ERROR" in line or "error" in line:
                    typer.echo(line.strip())

        raise typer.Exit(1)
        
    except typer.Exit:
        raise
    # =========================
    # OTHER ERRORS
    # =========================
    except Exception as e:
        msg = str(e)

        if "entry.py" in msg:
            _section("VALIDATION FAILED")
            _error(msg)
        else:
            _section("ERROR")
            _error(msg)

        raise typer.Exit(1)
    
    


# =========================
# TEMPLATE COMMANDS
# =========================

@app.command("view-template")
def view_template(name: str):
    try:
        content = load_template(name)
        _section(f"TEMPLATE: {name}")
        typer.echo(content)
    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command("select-template")
def select_template(name: str):
    try:
        available = list_templates()
        if name not in available:
            _error(f"Template not found. Available: {available}")
            raise typer.Exit(1)

        set_selected_template(name)
        _ok(f"Selected template: {name}")
    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command("clear-template")
def clear_template():
    set_selected_template(None)
    _ok("Template cleared")


# =========================
# RUN MANAGEMENT
# =========================

@app.command("list-runs")
def list_runs():
    runs = sorted(RUNS_METADATA_DIR.glob("run_*.json"))
    if not runs:
        typer.echo("No runs found.")
        return

    for r in runs:
        meta = _load_json(r)
        typer.echo(
            f"{r.stem} | {meta.get('model')} | {meta.get('status')} | {meta.get('duration_seconds')}s"
        )


@app.command()
def report(run_id: str):
    try:
        meta = _get_meta(run_id)

        if meta.get("status") not in {"completed", "incomplete"}:
            _error("Run not completed successfully enough to evaluate")
            raise typer.Exit(1)

        output = RUNS_OUTPUTS_DIR / run_id / "output.json"
        result = evaluate_run(str(output), als_mode=True)

        _section("MODEL REPORT")
        typer.echo(f"Score: {result.get('score')}")

        for k, v in result.get("metrics", {}).items():
            typer.echo(f"{k}: {v}")

        for w in result.get("warnings", []):
            _warn(w)

    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command()
def compare(run1: str, run2: str):
    try:
        f1 = RUNS_OUTPUTS_DIR / run1 / "output.json"
        f2 = RUNS_OUTPUTS_DIR / run2 / "output.json"

        r1 = evaluate_run(str(f1), als_mode=True)
        r2 = evaluate_run(str(f2), als_mode=True)

        _section("COMPARISON")

        for m in r1["metrics"]:
            if m in r2["metrics"]:
                diff = r1["metrics"][m] - r2["metrics"][m]
                typer.echo(f"{m}: {diff:+.4f}")

        insights = generate_insights(r1, r2, als_mode=True)
        for i in insights:
            typer.echo(f"- {i}")

    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command("visual-report")
def visual_report(run_id: str):
    try:
        data = generate_run_report(run_id, als_mode=True)
        _ok("Report generated")
        typer.echo(json.dumps(data, indent=2))
    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command("visual-compare")
def visual_compare(run_ids: str):
    try:
        ids = [r.strip() for r in run_ids.split(",") if r.strip()]
        data = generate_comparison_report(ids, als_mode=True)
        _ok("Comparison generated")
        typer.echo(json.dumps(data, indent=2))
    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command("compare-same-model")
def compare_same_model(run_id: str):
    try:
        data = generate_same_model_comparison(run_id, als_mode=True)
        _ok("Comparison generated")
        typer.echo(json.dumps(data, indent=2))
    except Exception as e:
        _error(str(e))
        raise typer.Exit(1)


@app.command("list-templates")
def cli_list_templates():
    templates = list_templates()
    if not templates:
        typer.echo("No templates available.")
        return

    for t in templates:
        typer.echo(f"- {t}")


if __name__ == "__main__":
    app()