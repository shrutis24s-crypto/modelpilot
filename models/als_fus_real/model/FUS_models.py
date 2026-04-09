"""
FUS Biomarker Classification Models
=====================================
Converted from FUS_models.ipynb
Original code by research collaborator.
No changes made to the ML logic.

Models included:
  - Random Forest + 3-fold CV + Shapiro-Wilk + p-value
  - SVM + 3-fold CV + Shapiro-Wilk + p-value
  - Logistic Regression + 3-fold CV + Shapiro-Wilk + p-value
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.preprocessing import MinMaxScaler
from scipy.stats import shapiro, ttest_1samp


def run_random_forest(X, y):
    """
    Random Forest + 3-fold CV + Shapiro-Wilk test + p-value
    Converted from Cell 18 of FUS_models.ipynb
    """
    print("\n" + "=" * 60)
    print("Random Forest — 3-Fold Cross Validation")
    print("=" * 60)

    cv_scores     = []
    sensitivities = []
    specificities = []
    all_y_test    = []
    all_y_pred    = []

    kf = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    for train_index, test_index in kf.split(X, y):
        X_train, X_test = X.iloc[train_index], X.iloc[test_index]
        y_train, y_test = y.iloc[train_index], y.iloc[test_index]

        scaler         = MinMaxScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled  = scaler.transform(X_test)

        rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        rf_model.fit(X_train_scaled, y_train)
        y_pred = rf_model.predict(X_test_scaled)

        fold_accuracy = accuracy_score(y_test, y_pred)
        cv_scores.append(fold_accuracy)
        all_y_test.extend(y_test)
        all_y_pred.extend(y_pred)

        cm = confusion_matrix(y_test, y_pred)
        TN, FP, FN, TP = cm.ravel()
        sensitivity = TP / (TP + FN) if (TP + FN) > 0 else 0
        specificity = TN / (TN + FP) if (TN + FP) > 0 else 0
        sensitivities.append(sensitivity)
        specificities.append(specificity)

    average_accuracy    = np.mean(cv_scores)
    average_sensitivity = np.mean(sensitivities)
    average_specificity = np.mean(specificities)

    print(f"\nAverage Accuracy across 3 folds: {average_accuracy:.2f} (+/- {np.std(cv_scores) * 2:.2f})")
    print(f"Average Sensitivity across 3 folds: {average_sensitivity:.2f} (+/- {np.std(sensitivities) * 2:.2f})")
    print(f"Average Specificity across 3 folds: {average_specificity:.2f} (+/- {np.std(specificities) * 2:.2f})")
    print(f"Individual Fold Accuracies: {cv_scores}")
    print(f"Individual Fold Sensitivities: {sensitivities}")
    print(f"Individual Fold Specificities: {specificities}")
    print("\nOverall Classification Report:")
    print(classification_report(all_y_test, all_y_pred))

    stat, p_value = shapiro(cv_scores)
    print(f"\nShapiro-Wilk Test for Accuracy Normality:")
    print(f"Statistic: {stat:.4f}")
    print(f"p-value: {p_value:.4f}")
    print("Note: p-value >= 0.05 suggests the accuracies are normally distributed.")

    baseline_accuracy = 0.5
    t_stat, p_value_t = ttest_1samp(cv_scores, baseline_accuracy, alternative="greater")
    print(f"\np-value for Random Forest accuracy: {p_value_t:.4f}")
    print(f"t-statistic: {t_stat:.4f}")

    return {
        "model":               "RandomForestClassifier",
        "average_accuracy":    round(float(average_accuracy), 4),
        "average_sensitivity": round(float(average_sensitivity), 4),
        "average_specificity": round(float(average_specificity), 4),
        "std_accuracy":        round(float(np.std(cv_scores)), 4),
        "fold_accuracies":     [round(float(s), 4) for s in cv_scores],
        "fold_sensitivities":  [round(float(s), 4) for s in sensitivities],
        "fold_specificities":  [round(float(s), 4) for s in specificities],
        "shapiro_statistic":   round(float(stat), 4),
        "shapiro_p_value":     round(float(p_value), 4),
        "ttest_p_value":       round(float(p_value_t), 4),
        "ttest_statistic":     round(float(t_stat), 4),
    }


def run_svm(X, y):
    """
    SVM + 3-fold CV + Shapiro-Wilk test + p-value
    Converted from Cell 22 of FUS_models.ipynb
    """
    print("\n" + "=" * 60)
    print("SVM — 3-Fold Cross Validation")
    print("=" * 60)

    cv_scores     = []
    sensitivities = []
    specificities = []
    all_y_test    = []
    all_y_pred    = []

    kf = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    for train_index, test_index in kf.split(X, y):
        X_train, X_test = X.iloc[train_index], X.iloc[test_index]
        y_train, y_test = y.iloc[train_index], y.iloc[test_index]

        scaler         = MinMaxScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled  = scaler.transform(X_test)

        svm_model = SVC(kernel="linear", C=1.0, random_state=42)
        svm_model.fit(X_train_scaled, y_train)
        y_pred = svm_model.predict(X_test_scaled)

        fold_accuracy = accuracy_score(y_test, y_pred)
        cv_scores.append(fold_accuracy)
        all_y_test.extend(y_test)
        all_y_pred.extend(y_pred)

        cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
        TN, FP, FN, TP = cm.ravel()
        sensitivity = TP / (TP + FN) if (TP + FN) > 0 else 0
        specificity = TN / (TN + FP) if (TN + FP) > 0 else 0
        sensitivities.append(sensitivity)
        specificities.append(specificity)

    print(f"\nAverage Accuracy across 3 folds: {np.mean(cv_scores):.2f} (+/- {np.std(cv_scores) * 2:.2f})")
    print(f"Average Sensitivity across 3 folds: {np.mean(sensitivities):.2f} (+/- {np.std(sensitivities) * 2:.2f})")
    print(f"Average Specificity across 3 folds: {np.mean(specificities):.2f} (+/- {np.std(specificities) * 2:.2f})")
    print(f"Individual Fold Accuracies: {cv_scores}")
    print(f"Individual Fold Sensitivities: {sensitivities}")
    print(f"Individual Fold Specificities: {specificities}")
    print("\nOverall Classification Report:")
    print(classification_report(all_y_test, all_y_pred))

    stat, p_value = shapiro(cv_scores)
    print(f"\nShapiro-Wilk Test for Accuracy Normality:")
    print(f"Statistic: {stat:.4f}")
    print(f"p-value: {p_value:.4f}")

    t_stat, p_value_t = ttest_1samp(cv_scores, 0.5, alternative="greater")
    print(f"\np-value for SVM accuracy: {p_value_t:.4f}")
    print(f"t-statistic: {t_stat:.4f}")

    return {
        "model":               "SVM_linear",
        "average_accuracy":    round(float(np.mean(cv_scores)), 4),
        "average_sensitivity": round(float(np.mean(sensitivities)), 4),
        "average_specificity": round(float(np.mean(specificities)), 4),
        "std_accuracy":        round(float(np.std(cv_scores)), 4),
        "fold_accuracies":     [round(float(s), 4) for s in cv_scores],
        "fold_sensitivities":  [round(float(s), 4) for s in sensitivities],
        "fold_specificities":  [round(float(s), 4) for s in specificities],
        "shapiro_p_value":     round(float(p_value), 4),
        "ttest_p_value":       round(float(p_value_t), 4),
    }


def run_logistic_regression(X, y):
    """
    Logistic Regression + 3-fold CV + Shapiro-Wilk test + p-value
    Converted from Cell 28 of FUS_models.ipynb
    """
    print("\n" + "=" * 60)
    print("Logistic Regression — 3-Fold Cross Validation")
    print("=" * 60)

    cv_scores     = []
    sensitivities = []
    specificities = []
    all_y_test    = []
    all_y_pred    = []

    kf = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    for train_index, test_index in kf.split(X, y):
        X_train, X_test = X.iloc[train_index], X.iloc[test_index]
        y_train, y_test = y.iloc[train_index], y.iloc[test_index]

        scaler         = MinMaxScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled  = scaler.transform(X_test)

        lr_model = LogisticRegression(random_state=42)
        lr_model.fit(X_train_scaled, y_train)
        y_pred = lr_model.predict(X_test_scaled)

        all_y_test.extend(y_test)
        all_y_pred.extend(y_pred)

        fold_accuracy = accuracy_score(y_test, y_pred)
        cv_scores.append(fold_accuracy)

        cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
        TN, FP, FN, TP = cm.ravel()
        sensitivity = TP / (TP + FN) if (TP + FN) > 0 else 0
        specificity = TN / (TN + FP) if (TN + FP) > 0 else 0
        sensitivities.append(sensitivity)
        specificities.append(specificity)

    print(f"\nAverage Accuracy across 3 folds: {np.mean(cv_scores):.2f} (+/- {np.std(cv_scores) * 2:.2f})")
    print(f"Average Sensitivity across 3 folds: {np.mean(sensitivities):.2f} (+/- {np.std(sensitivities) * 2:.2f})")
    print(f"Average Specificity across 3 folds: {np.mean(specificities):.2f} (+/- {np.std(specificities) * 2:.2f})")
    print(f"Individual Fold Accuracies: {cv_scores}")
    print(f"Individual Fold Sensitivities: {sensitivities}")
    print(f"Individual Fold Specificities: {specificities}")
    print("\nOverall Classification Report:")
    print(classification_report(all_y_test, all_y_pred))

    stat, p_value = shapiro(cv_scores)
    print(f"\nShapiro-Wilk Test for Accuracy Normality:")
    print(f"Statistic: {stat:.4f}")
    print(f"p-value: {p_value:.4f}")

    t_stat, p_value_t = ttest_1samp(cv_scores, 0.5, alternative="greater")
    print(f"\np-value for Logistic Regression accuracy: {p_value_t:.4f}")
    print(f"t-statistic: {t_stat:.4f}")

    return {
        "model":               "LogisticRegression",
        "average_accuracy":    round(float(np.mean(cv_scores)), 4),
        "average_sensitivity": round(float(np.mean(sensitivities)), 4),
        "average_specificity": round(float(np.mean(specificities)), 4),
        "std_accuracy":        round(float(np.std(cv_scores)), 4),
        "fold_accuracies":     [round(float(s), 4) for s in cv_scores],
        "fold_sensitivities":  [round(float(s), 4) for s in sensitivities],
        "fold_specificities":  [round(float(s), 4) for s in specificities],
        "shapiro_p_value":     round(float(p_value), 4),
        "ttest_p_value":       round(float(p_value_t), 4),
    }
