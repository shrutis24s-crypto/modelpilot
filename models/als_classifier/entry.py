"""
ModelPilot Entry Script - ALS Classifier (Random Forest)
Loads ALS FUS biomarker data from /app/input/als_data.csv,
runs the classification pipeline, saves output.json to /app/output/
"""

import json
import os
import sys
import numpy as np
import pandas as pd
from model import run_pipeline

# ── Paths ─────────────────────────────────────────────────────
INPUT_DIR  = "/app/input"
INPUT_PATH = os.path.join(INPUT_DIR, "als_data.csv")
OUTPUT_DIR = "/app/output"
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "output.json")

print("=" * 55)
print("ModelPilot | ALS Biomarker Classifier (Random Forest)")
print("=" * 55)
print(f"Input  : {INPUT_PATH}")
print(f"Output : {OUTPUT_PATH}")
print()

# ── Load Data ─────────────────────────────────────────────────
if not os.path.exists(INPUT_PATH):
    print(f"ERROR: Input file not found at {INPUT_PATH}")
    print("Please pass --input path/to/als_data.csv when running.")
    sys.exit(1)

df = pd.read_csv(INPUT_PATH)
print(f"Loaded dataset: {df.shape[0]} samples, {df.shape[1]} columns")

# Drop non-feature columns
drop_cols = ["Image", "Diagnosis"]
feature_cols = [c for c in df.columns if c not in drop_cols]
X = df[feature_cols].values.astype(np.float32)
y = df["Diagnosis"].values

print(f"Features : {len(feature_cols)}")
print(f"Classes  : {dict(zip(*np.unique(y, return_counts=True)))}")
print()

# ── Run Pipeline ──────────────────────────────────────────────
results = run_pipeline(X, y, feature_cols)

# ── Print Summary ─────────────────────────────────────────────
print("=" * 55)
print("FINAL RESULTS")
print("=" * 55)
for k, v in results["metrics"].items():
    print(f"  {k:<20}: {v}")
print()

# ── Save output.json ──────────────────────────────────────────
os.makedirs(OUTPUT_DIR, exist_ok=True)

output = {
    "task_type": "classification",
    "model": "RandomForestClassifier",
    "dataset": "als_fus_biomarker",
    "n_samples": int(df.shape[0]),
    "n_features": len(feature_cols),
    "feature_names": feature_cols,
    "class_distribution": {
        "Case (1)": int(np.sum(y == 1)),
        "Control (0)": int(np.sum(y == 0)),
    },
    "metrics": results["metrics"],
    "fold_results": results["fold_results"],
    "predictions": results["predictions"],
    "status": "completed",
}

with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, indent=2)

print(f"Output saved to {OUTPUT_PATH}")
print("Pipeline complete.")
