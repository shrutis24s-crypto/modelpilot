"""
ModelPilot Entry Script — ALS FUS Real World Model
====================================================


This entry script runs the real-world ALS FUS biomarker
classification pipeline on the processed_FUSdata.csv dataset.
The model code is unchanged from the original research notebook
(FUS_models.ipynb) provided by a research collaborator.

Only structural changes were made to load data from
/app/input/ and save output to /app/output/ as required
by ModelPilot's execution interface.
"""

import json
import os
import sys

# Add model directory to path so imports work inside container
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "model"))

from FUS_dataset_preparation import prepare_fus_data # type: ignore
from FUS_models import run_random_forest, run_svm, run_logistic_regression # type: ignore

# ── Paths ─────────────────────────────────────────────────────
INPUT_DIR  = "/app/input/"
OUTPUT_DIR = "/app/output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

csv_path = os.path.join(INPUT_DIR, "processed_FUSdata.csv")

print("=" * 60)
print("ModelPilot | ALS FUS Biomarker Classification")
print("Real-world ALS research pipeline")
print("=" * 60)
print(f"Input  : {csv_path}")
print(f"Output : {OUTPUT_DIR}")
print()

# ── Check input ───────────────────────────────────────────────
if not os.path.exists(csv_path):
    print(f"ERROR: Input file not found at {csv_path}")
    print("Please pass --input path/to/folder/containing/processed_FUSdata.csv")
    sys.exit(1)

# ── Prepare data ──────────────────────────────────────────────
X, y, features = prepare_fus_data(csv_path)

# ── Run models ────────────────────────────────────────────────
rf_results = run_random_forest(X, y)
svm_results = run_svm(X, y)
lr_results = run_logistic_regression(X, y)

# ── Save output.json ──────────────────────────────────────────
output = {
    "task_type":  "classification",
    "dataset":    "processed_FUSdata.csv",
    "n_samples":  int(X.shape[0]),
    "n_features": len(features),
    "metrics": {
        "accuracy":    rf_results["average_accuracy"],
        "sensitivity": rf_results["average_sensitivity"],
        "specificity": rf_results["average_specificity"],
        "f1_score":    round(
            2 * rf_results["average_sensitivity"] * rf_results["average_accuracy"] /
            (rf_results["average_sensitivity"] + rf_results["average_accuracy"] + 1e-8),
            4
        ),
        "loss": round(1 - rf_results["average_accuracy"], 4),
    },
    "models_evaluated": {
        "random_forest":       rf_results,
        "svm":                 svm_results,
        "logistic_regression": lr_results,
    },
    "status": "completed",
}

output_path = os.path.join(OUTPUT_DIR, "output.json")
with open(output_path, "w") as f:
    json.dump(output, f, indent=2)

print("\n" + "=" * 60)
print("PIPELINE COMPLETE")
print("=" * 60)
print(f"Output saved to {output_path}")
print()
print("Summary:")
print(f"  Random Forest  — accuracy: {rf_results['average_accuracy']:.4f}  "
      f"sensitivity: {rf_results['average_sensitivity']:.4f}  "
      f"specificity: {rf_results['average_specificity']:.4f}")
print(f"  SVM            — accuracy: {svm_results['average_accuracy']:.4f}  "
      f"sensitivity: {svm_results['average_sensitivity']:.4f}  "
      f"specificity: {svm_results['average_specificity']:.4f}")
print(f"  Logistic Reg.  — accuracy: {lr_results['average_accuracy']:.4f}  "
      f"sensitivity: {lr_results['average_sensitivity']:.4f}  "
      f"specificity: {lr_results['average_specificity']:.4f}")
