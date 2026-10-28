"""Train and evaluate the password-strength classifier.

ML lifecycle steps covered here:
  * Load the labelled dataset (building it first if needed).
  * Transform raw passwords into engineered features (src/features.py).
  * Split into train/test sets (stratified, so class balance is preserved).
  * Train a model and a simple baseline to compare against.
  * Evaluate with accuracy, a classification report and a confusion matrix.
  * Persist the fitted model to models/ so the website can load it.

Run:  python -m src.train
"""

from __future__ import annotations

import os

import joblib
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import cross_val_score, train_test_split

from .features import FEATURE_NAMES, extract_frame
from .make_dataset import CSV_PATH, generate

HERE = os.path.dirname(__file__)
MODELS_DIR = os.path.join(HERE, "..", "models")
MODEL_PATH = os.path.join(MODELS_DIR, "model.joblib")

LABELS = {0: "Weak", 1: "Medium", 2: "Strong"}


def load_dataset() -> pd.DataFrame:
    if os.path.exists(CSV_PATH):
        return pd.read_csv(CSV_PATH)
    print("No dataset on disk — generating synthetic one...")
    df = generate()
    df.to_csv(CSV_PATH, index=False)
    return df


def main() -> None:
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = load_dataset().dropna(subset=["password"])
    df["password"] = df["password"].astype(str)
    print(f"Dataset: {len(df)} passwords")
    print("Class balance:\n", df["strength"].value_counts().sort_index(), "\n")

    # --- Feature extraction -------------------------------------------------
    X = extract_frame(df["password"])
    y = df["strength"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # --- Baseline (most-frequent class) -------------------------------------
    baseline = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
    base_acc = accuracy_score(y_test, baseline.predict(X_test))
    print(f"Baseline accuracy (most-frequent class): {base_acc:.3f}")

    # --- Model --------------------------------------------------------------
    model = RandomForestClassifier(
        n_estimators=200, max_depth=None, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nRandomForest test accuracy: {acc:.3f}\n")
    print(classification_report(y_test, y_pred, target_names=list(LABELS.values())))
    print("Confusion matrix (rows=true, cols=pred):")
    print(confusion_matrix(y_test, y_pred))

    cv = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    print(f"\n5-fold CV accuracy: {cv.mean():.3f} +/- {cv.std():.3f}")

    print("\nTop feature importances:")
    importances = sorted(
        zip(FEATURE_NAMES, model.feature_importances_),
        key=lambda t: t[1],
        reverse=True,
    )
    for name, imp in importances[:8]:
        print(f"  {name:18s} {imp:.3f}")

    joblib.dump({"model": model, "features": FEATURE_NAMES, "labels": LABELS}, MODEL_PATH)
    print(f"\nSaved model -> {MODEL_PATH}")


if __name__ == "__main__":
    main()
