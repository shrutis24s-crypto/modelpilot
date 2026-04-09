"""
ALS FUS Biomarker Classification Model - SVM
Support Vector Machine with RBF kernel, 3-fold Stratified CV
Based on ALS FUS biomarker pipeline (SVM variant)
"""

import numpy as np
from sklearn.svm import SVC
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

SEED = 42


def run_pipeline(X, y, feature_names):
    """
    Runs 3-fold stratified cross validation with MinMaxScaler
    and SVM (RBF kernel). Returns aggregated results dict.
    """

    kf = StratifiedKFold(n_splits=3, shuffle=True, random_state=SEED)

    cv_scores = []
    sensitivities = []
    specificities = []
    f1_scores = []
    all_y_test = []
    all_y_pred = []
    fold_results = []

    print("Running 3-Fold Stratified Cross Validation (SVM - RBF kernel)...")
    print()

    for fold, (train_idx, test_idx) in enumerate(kf.split(X, y), 1):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        scaler = MinMaxScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # SVM with RBF kernel (same as ALS FUS notebook SVM section)
        svm = SVC(
            kernel="rbf",
            C=1.0,
            gamma="scale",
            random_state=SEED,
        )
        svm.fit(X_train_scaled, y_train)
        y_pred = svm.predict(X_test_scaled)

        acc = float(accuracy_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        sensitivity = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

        cv_scores.append(acc)
        f1_scores.append(f1)
        sensitivities.append(sensitivity)
        specificities.append(specificity)
        all_y_test.extend(y_test.tolist())
        all_y_pred.extend(y_pred.tolist())

        fold_results.append({
            "fold": fold,
            "accuracy": round(acc, 4),
            "f1_score": round(f1, 4),
            "sensitivity": round(sensitivity, 4),
            "specificity": round(specificity, 4),
        })

        print(
            f"  Fold {fold}: accuracy={acc:.4f} | "
            f"sensitivity={sensitivity:.4f} | specificity={specificity:.4f}"
        )

    mean_acc = float(np.mean(cv_scores))
    mean_f1 = float(np.mean(f1_scores))
    mean_sens = float(np.mean(sensitivities))
    mean_spec = float(np.mean(specificities))

    print()
    print("Overall Classification Report:")
    print(classification_report(all_y_test, all_y_pred, zero_division=0))

    return {
        "metrics": {
            "accuracy": round(mean_acc, 4),
            "f1_score": round(mean_f1, 4),
            "sensitivity": round(mean_sens, 4),
            "specificity": round(mean_spec, 4),
            "loss": round(1 - mean_acc, 4),
        },
        "fold_results": fold_results,
        "predictions": all_y_pred[:20],
    }
