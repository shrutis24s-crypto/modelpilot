"""
FUS Dataset Preparation
========================
Converted from FUS_dataset_preparation.ipynb
Original code by research collaborator.
No changes made to the data processing logic.
"""

import pandas as pd
import numpy as np


def prepare_fus_data(csv_path: str):
    """
    Loads and prepares the FUS biomarker dataset.
    Returns X (features), y (labels), and feature names.
    """

    # ── Load data ─────────────────────────────────────────────
    FUSdata = pd.read_csv(csv_path)
    print(f"Loaded dataset: {FUSdata.shape[0]} samples, {FUSdata.shape[1]} columns")
    print(FUSdata.head(2))

    # ── Remove columns with all zeros or constant values ──────
    zero_columns     = FUSdata.columns[FUSdata.eq(0).all()]
    constant_columns = FUSdata.columns[FUSdata.nunique() == 1]
    columns_to_remove = set(zero_columns).union(set(constant_columns))

    if columns_to_remove:
        FUSdata_filtered = FUSdata.drop(columns=columns_to_remove)
        print(f"\nRemoved columns: {list(columns_to_remove)}")
    else:
        FUSdata_filtered = FUSdata.copy()
        print("\nNo columns with all zeros or constant values found.")

    print("Filtered Data - First 2 rows:")
    print(FUSdata_filtered.head(2))

    # ── Remove collinear features (|r| >= 0.95) ───────────────
    FUSdata_filtered = FUSdata_filtered.dropna(subset=["Diagnosis"])
    numeric_data       = FUSdata_filtered.select_dtypes(include=["int64", "float64"])
    correlation_matrix = numeric_data.corr()

    columns_to_drop = set()
    for i in range(len(correlation_matrix.columns)):
        for j in range(i + 1, len(correlation_matrix.columns)):
            if abs(correlation_matrix.iloc[i, j]) >= 0.95:
                columns_to_drop.add(correlation_matrix.columns[j])

    if columns_to_drop:
        FUSdata_no_collinearity = FUSdata_filtered.drop(columns=columns_to_drop)
        print(f"\nRemoved collinear columns (|r| >= 0.95): {len(columns_to_drop)} columns")
    else:
        FUSdata_no_collinearity = FUSdata_filtered.copy()
        print("\nNo columns removed due to collinearity.")

    # ── Define features and target ────────────────────────────
    FUSdata_no_collinearity = FUSdata_no_collinearity.dropna(subset=["Diagnosis"])
    features = [
        col for col in FUSdata_no_collinearity.columns
        if col not in ["Image", "Diagnosis"]
    ]
    X = FUSdata_no_collinearity[features]
    y = FUSdata_no_collinearity["Diagnosis"]

    print(f"\nFeatures after preparation: {len(features)}")
    print(f"Class distribution:\n{y.value_counts()}")

    return X, y, features
