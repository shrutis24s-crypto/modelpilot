import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import docker
from docker.errors import ImageNotFound

from .registry import ModelSpec
from .dockerfile_gen import generate_dockerfile
from .templates import load_template
from .config import (
    RUNS_METADATA_DIR,
    ensure_dirs,
    IMAGE_NAME_PREFIX,
    get_selected_template,
)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _write_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _iter_files(model_dir: Path, exclude_names: set[str] | None = None) -> Iterable[Path]:
    ignored_dirs = {
        "__pycache__",
        ".git",
        ".venv",
        "venv",
        ".pytest_cache",
        ".mypy_cache",
    }
    exclude_names = exclude_names or set()

    for path in sorted(model_dir.rglob("*")):
        if not path.is_file():
            continue
        if any(part in ignored_dirs for part in path.parts):
            continue
        if path.name in exclude_names:
            continue
        yield path


def _compute_hash(spec: ModelSpec, dockerfile_name: str) -> str:
    h = hashlib.sha256()

    dockerfile_path = spec.path / dockerfile_name
    if not dockerfile_path.exists():
        raise FileNotFoundError(f"Missing Dockerfile: {dockerfile_path}")

    h.update(dockerfile_name.encode("utf-8"))
    h.update(dockerfile_path.read_bytes())

    excluded = {
        dockerfile_name,
        "Dockerfile.generated",
        "Dockerfile.template",
    }

    for path in _iter_files(spec.path, exclude_names=excluded):
        h.update(path.relative_to(spec.path).as_posix().encode("utf-8"))
        h.update(path.read_bytes())

    return h.hexdigest()[:12]


def _image_exists(client, tag):
    try:
        client.images.get(tag)
        return True
    except ImageNotFound:
        return False


def _remove_image_if_exists(client, tag):
    try:
        client.images.remove(image=tag, force=True)
    except Exception:
        pass


def build_image(spec: ModelSpec, force_rebuild: bool = False):
    ensure_dirs()
    client = docker.from_env()

    dockerfile_name = "Dockerfile"
    used_generated = False
    used_template = False

    selected_template = get_selected_template()

    if selected_template:
        dockerfile_name = "Dockerfile.template"
        dockerfile_path = spec.path / dockerfile_name
        content = load_template(selected_template)
        dockerfile_path.write_text(content, encoding="utf-8")
        used_template = True

    elif spec.dockerfile_path is not None:
        dockerfile_name = spec.dockerfile_path.name

    else:
        generated = generate_dockerfile(spec.path)
        dockerfile_name = generated.name
        used_generated = True

    build_source = {
        "dockerfile": dockerfile_name,
        "generated": used_generated,
        "template": selected_template if used_template else None,
    }

    build_hash = _compute_hash(spec, dockerfile_name)
    image_tag = f"{IMAGE_NAME_PREFIX}/{spec.name}:{build_hash}"

    metadata_path = RUNS_METADATA_DIR / f"build_{spec.name}_{build_hash}.json"

    if force_rebuild:
        _remove_image_if_exists(client, image_tag)

    if _image_exists(client, image_tag) and not force_rebuild:
        metadata = {
            "type": "build",
            "model": spec.name,
            "version": build_hash,
            "build_context_hash": build_hash,
            "image_tag": image_tag,
            "build_source": build_source,
            "reused_from_cache": True,
            "status": "completed",
            "timestamp_utc": _now(),
        }
        _write_json(metadata_path, metadata)
        return image_tag, build_hash, build_source

    start = time.time()
    started_at = _now()

    try:
        image, logs = client.images.build(
            path=str(spec.path),
            dockerfile=dockerfile_name,
            tag=image_tag,
            rm=True,
        )
    except Exception as e:
        metadata = {
            "type": "build",
            "model": spec.name,
            "version": build_hash,
            "build_context_hash": build_hash,
            "image_tag": image_tag,
            "build_source": build_source,
            "reused_from_cache": False,
            "status": "failed",
            "error": str(e),
            "timestamp_utc": _now(),
        }
        _write_json(metadata_path, metadata)
        raise

    metadata = {
        "type": "build",
        "model": spec.name,
        "version": build_hash,
        "build_context_hash": build_hash,
        "image_tag": image_tag,
        "image_id": image.id,
        "build_source": build_source,
        "reused_from_cache": False,
        "status": "completed",
        "build_started_utc": started_at,
        "build_finished_utc": _now(),
        "duration_seconds": round(time.time() - start, 3),
    }

    _write_json(metadata_path, metadata)
    return image_tag, build_hash, build_source