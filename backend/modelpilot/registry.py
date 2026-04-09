from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from .validator import validate_model, print_report
from .config import MODELS_DIR


@dataclass
class ModelSpec:
    name: str
    path: Path
    dockerfile_path: Optional[Path]
    entry_script: Optional[Path]
    requirements_path: Optional[Path]


def resolve_model(model_name: str) -> ModelSpec:
    """
    Finds and validates a model folder.
    Accepts:
        - A Dockerfile
        OR
        - entry.py + requirements.txt
    """

    model_path = (MODELS_DIR / model_name).resolve()

    if not model_path.exists() or not model_path.is_dir():
        raise ValueError(f"Model folder not found: {model_path}")

    dockerfile = model_path / "Dockerfile"
    entry = model_path / "entry.py"
    requirements = model_path / "requirements.txt"

    dockerfile_path = dockerfile if dockerfile.exists() else None
    entry_path = entry if entry.exists() else None
    requirements_path = requirements if requirements.exists() else None

    # FR-1 logic
    

    # entry.py MUST exist always
    if entry_path is None:
        raise ValueError(
            f"Model '{model_name}' is missing required entry script: entry.py"
        )

    # If no Dockerfile → must have requirements.txt
    if dockerfile_path is None and requirements_path is None:
        raise ValueError(
            "No Dockerfile found. Model must contain either:\n"
            "1) A Dockerfile\n"
            "OR\n"
            "2) requirements.txt (with entry.py)"
        )
    report = validate_model(model_path)
    print_report(report)
    return ModelSpec(
        name=model_name,
        path=model_path,
        dockerfile_path=dockerfile_path,
        entry_script=entry_path,
        requirements_path=requirements_path,
    )


def list_models():
    """
    Returns list of model folder names inside ./models
    """
    if not MODELS_DIR.exists():
        return []

    return sorted([
        p.name for p in MODELS_DIR.iterdir()
        if p.is_dir()
    ])