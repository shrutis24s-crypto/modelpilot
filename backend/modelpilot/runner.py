import json
import secrets
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import docker

from .config import (
    ensure_dirs,
    INPUTS_DIR,
    RUNS_LOGS_DIR,
    RUNS_OUTPUTS_DIR,
    RUNS_METADATA_DIR,
    DEFAULT_RUN_TIMEOUT_SECONDS,
)


def _new_run_id():
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    rand = secrets.token_hex(3)
    return f"run_{ts}_{rand}"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _write_json(path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _check_host_gpu_available():
    try:
        result = subprocess.run(
            ["nvidia-smi"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=3,
        )
        return result.returncode == 0
    except Exception:
        return False


def _docker_supports_gpu(client):
    try:
        info = client.info()
        runtimes = info.get("Runtimes", {})
        return "nvidia" in runtimes
    except Exception:
        return False


def _run_container(client, image_tag, volumes, device_requests, timeout):
    container = None
    start_time = time.time()

    result = {
        "status": "unknown",
        "exit_code": None,
        "stdout": "",
        "stderr": "",
        "error": None,
    }

    try:
        container = client.containers.run(
            image=image_tag,
            detach=True,
            volumes=volumes,
            device_requests=device_requests,
        )

        wait_result = container.wait(timeout=timeout)
        result["exit_code"] = wait_result.get("StatusCode", -1)

        result["stdout"] = container.logs(stdout=True, stderr=False).decode(errors="replace")
        result["stderr"] = container.logs(stdout=False, stderr=True).decode(errors="replace")

        result["status"] = "completed" if result["exit_code"] == 0 else "failed"

    except Exception as e:
        result["status"] = "failed"
        result["exit_code"] = -1
        result["error"] = str(e)

    finally:
        try:
            if container:
                container.remove(force=True)
        except Exception:
            pass

    result["duration"] = round(time.time() - start_time, 3)
    return result


def run_image(
    image_tag,
    model_name,
    version,
    use_gpu=False,
    timeout_seconds=DEFAULT_RUN_TIMEOUT_SECONDS,
    input_path=None,
    build_source=None,
):
    ensure_dirs()
    client = docker.from_env()

    run_id = _new_run_id()

    output_dir = RUNS_OUTPUTS_DIR / run_id
    log_dir = RUNS_LOGS_DIR / run_id

    output_dir.mkdir(parents=True, exist_ok=True)
    log_dir.mkdir(parents=True, exist_ok=True)

    input_dir = Path(input_path) if input_path else INPUTS_DIR
    if not input_dir.exists():
        raise FileNotFoundError(f"Input path does not exist: {input_dir}")

    output_json_path = output_dir / "output.json"

    volumes = {
        str(output_dir.resolve()): {"bind": "/app/output", "mode": "rw"},
        str(input_dir.resolve()): {"bind": "/app/input", "mode": "ro"},
    }

    gpu_requested = use_gpu
    gpu_available = _check_host_gpu_available()
    docker_gpu_supported = _docker_supports_gpu(client)
    gpu_runtime_ready = gpu_available and docker_gpu_supported

    device_requests = None
    gpu_used = False
    gpu_fallback = False
    warning = None

    if gpu_requested:
        if not gpu_runtime_ready:
            gpu_fallback = True
            warning = "GPU requested but not available. Falling back to CPU."
        else:
            device_requests = [
                docker.types.DeviceRequest(count=-1, capabilities=[["gpu"]])
            ]

    result = _run_container(
        client,
        image_tag,
        volumes,
        device_requests,
        timeout_seconds,
    )

    if gpu_requested and device_requests is not None and result["status"] != "completed":
        gpu_fallback = True
        warning = "GPU execution failed. Retrying on CPU."

        result = _run_container(
            client,
            image_tag,
            volumes,
            None,
            timeout_seconds,
        )

    output_json_exists = output_json_path.exists()
    if result["status"] == "completed" and not output_json_exists:
        result["status"] = "incomplete"
        if result["error"] is None:
            result["error"] = "Run completed but output.json was not produced."

    gpu_used = gpu_requested and not gpu_fallback and result["status"] == "completed"
    hardware_device = "gpu" if gpu_used else "cpu"

    (log_dir / "stdout.log").write_text(result["stdout"], encoding="utf-8")
    (log_dir / "stderr.log").write_text(result["stderr"], encoding="utf-8")

    metadata = {
        "run_id": run_id,
        "model": model_name,
        "version": version,
        "image_tag": image_tag,
        "build_source": build_source,
        "timestamp_utc": _now(),
        "input_path": str(input_dir.resolve()),
        "output_path": str(output_dir.resolve()),
        "output_json_path": str(output_json_path.resolve()),
        "output_json_exists": output_json_exists,
        "gpu_requested": gpu_requested,
        "gpu_available": gpu_available,
        "gpu_runtime_ready": gpu_runtime_ready,
        "gpu_used": gpu_used,
        "gpu_fallback": gpu_fallback,
        "hardware_device": hardware_device,
        "warning": warning,
        "status": result["status"],
        "exit_code": result["exit_code"],
        "duration_seconds": result["duration"],
        "error": result["error"],
    }

    _write_json(RUNS_METADATA_DIR / f"{run_id}.json", metadata)
    return run_id