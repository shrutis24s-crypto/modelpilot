from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"


def list_templates():
    return sorted([p.stem for p in TEMPLATES_DIR.glob("*.Dockerfile")])


def load_template(name: str) -> str:
    path = TEMPLATES_DIR / f"{name}.Dockerfile"
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {name}")
    return path.read_text(encoding="utf-8")