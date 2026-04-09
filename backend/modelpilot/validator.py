from pathlib import Path
from difflib import get_close_matches

VALID_PACKAGES = [
    "torch", "torchvision", "torchaudio",
    "tensorflow", "keras",
    "numpy", "pandas",
    "scikit-learn",
    "matplotlib", "seaborn",
    "opencv-python",
    "nibabel", "simpleitk",
    "tqdm", "pyyaml"
]

COMMON_ERRORS = {
    "pandaz": "pandas",
    "numpi": "numpy",
    "torh": "torch",
    "tensorflo": "tensorflow",
    "sklearn": "scikit-learn",
}


def validate_dockerfile(path: Path):
    issues = []
    content = path.read_text(encoding="utf-8").lower()

    if "from" not in content:
        issues.append("Missing FROM instruction")

    if "copy" not in content:
        issues.append("Missing COPY instruction")

    if "cmd" not in content and "entrypoint" not in content:
        issues.append("Missing CMD or ENTRYPOINT")

    return issues


def validate_requirements(path: Path):
    issues = []
    suggestions = []

    if not path.exists():
        return ["requirements.txt not found"], []

    lines = path.read_text(encoding="utf-8").splitlines()

    if not lines:
        issues.append("requirements.txt is empty")

    for line in lines:
        raw = line.strip().lower()
        if not raw or raw.startswith("#"):
            continue

        pkg = raw.split("==")[0].split(">=")[0].split("<=")[0].strip()
        if not pkg:
            continue

        if pkg in COMMON_ERRORS:
            suggestions.append((pkg, COMMON_ERRORS[pkg], "high"))
            continue

        if pkg in VALID_PACKAGES:
            continue

        match = get_close_matches(pkg, VALID_PACKAGES, n=1, cutoff=0.7)
        if match and match[0] != pkg:
            suggestions.append((pkg, match[0], "medium"))
        else:
            suggestions.append((pkg, None, "low"))

    return issues, suggestions


def validate_entry(path: Path):
    issues = []

    if not path.exists():
        return ["Entry script not found"]

    content = path.read_text(encoding="utf-8").lower()

    input_signals = ["/app/input", "input/", "input_path", "read_csv", "load"]
    output_signals = ["/app/output", "output.json", "json.dump", "write_text"]

    if not any(signal in content for signal in input_signals):
        issues.append("No clear input handling detected")

    if not any(signal in content for signal in output_signals):
        issues.append("No clear output.json writing detected")

    return issues


def validate_model(model_path: Path):
    report = {
        "dockerfile": [],
        "requirements": [],
        "entry": [],
        "suggestions": [],
        "source": "dockerfile" or "requirements"
    }

    dockerfile = model_path / "Dockerfile"
    req = model_path / "requirements.txt"
    entry = model_path / "entry.py"

    if dockerfile.exists():
        report["source"] = "dockerfile"
        report["dockerfile"] = validate_dockerfile(dockerfile)
    else:
        report["source"] = "requirements"
        req_issues, suggestions = validate_requirements(req)
        report["requirements"] = req_issues
        report["suggestions"] = suggestions
        report["entry"] = validate_entry(entry)

    return report


def print_report(report):
    print("\nModel Validation Report\n")

    # =========================
    # DOCKERFILE OR REQUIREMENTS
    # =========================

    if report["source"] == "dockerfile":
        if report["dockerfile"]:
            print("Dockerfile issues:")
            for i in report["dockerfile"]:
                print(f"- {i}")
        else:
            print("Dockerfile: present")

    elif report["source"] == "requirements":
        if report["requirements"]:
            print("Requirements issues:")
            for i in report["requirements"]:
                print(f"- {i}")
        else:
            print("Requirements file: present")
    # =========================
    # ENTRY SCRIPT
    # =========================

    if report["entry"]:
        print("\nEntry script issues:")
        for i in report["entry"]:
            print(f"- {i}")
    else:
        print("\nEntry script: present")

    # =========================
    # SUGGESTIONS 
    # =========================

    if report["suggestions"]:
        print("\nDependency suggestions:")
        for pkg, suggestion, confidence in report["suggestions"]:
            if suggestion:
                print(f"- {pkg} -> {suggestion} ({confidence} confidence)")
            else:
                print(f"- {pkg} -> no suggestion ({confidence} confidence)")