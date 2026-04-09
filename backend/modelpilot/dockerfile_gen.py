from pathlib import Path

from .config import (
    DEFAULT_BUILD_BASE_IMAGE,
    DEFAULT_CONTAINER_INPUT_DIR,
    DEFAULT_CONTAINER_OUTPUT_DIR,
)


def _generated_dockerfile_content() -> str:
    """
    Return deterministic Dockerfile content for models that provide
    requirements.txt + entry.py but no Dockerfile.
    """
    return (
        f"FROM {DEFAULT_BUILD_BASE_IMAGE}\n"
        "\n"
        "WORKDIR /app\n"
        "\n"
        "COPY requirements.txt /app/requirements.txt\n"
        "RUN pip install --no-cache-dir -r /app/requirements.txt\n"
        "\n"
        "COPY . /app\n"
        "\n"
        f"RUN mkdir -p {DEFAULT_CONTAINER_INPUT_DIR} {DEFAULT_CONTAINER_OUTPUT_DIR}\n"
        "\n"
        'CMD ["python", "/app/entry.py"]\n'
    )


def generate_dockerfile(model_dir: Path) -> Path:
    """
    Generate a deterministic Dockerfile when the user did not provide one.

    Expected conventions inside the container:
    - Input directory is mounted at /app/input
    - Output directory is mounted at /app/output
    - The model entry script is /app/entry.py

    Important:
    - We do not modify user model code
    - We only generate infrastructure-level build instructions
    """
    dockerfile_path = model_dir / "Dockerfile.generated"
    content = _generated_dockerfile_content()

    # Only rewrite if content differs, to keep generation deterministic
    # and avoid unnecessary file churn.
    existing = dockerfile_path.read_text(encoding="utf-8") if dockerfile_path.exists() else None
    if existing != content:
        dockerfile_path.write_text(content, encoding="utf-8")

    return dockerfile_path