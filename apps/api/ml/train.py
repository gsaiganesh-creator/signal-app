"""Trains the signal classifier on backtest_labels.py's output.
Run manually: python3 -m ml.train"""
import logging
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score

from ml.backtest_labels import OUTPUT_PATH
from ml.features import FEATURE_COLUMNS

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "model.joblib"
TRAIN_CUTOFF = "2026-01-01"
SANE_BAND = (0.30, 0.70)


def train() -> None:
    df = pd.read_parquet(OUTPUT_PATH)
    df["date"] = pd.to_datetime(df["date"])

    train_df = df[df["date"] < TRAIN_CUTOFF]
    val_df = df[df["date"] >= TRAIN_CUTOFF]
    if train_df.empty or val_df.empty:
        raise RuntimeError(
            f"train/val split produced an empty set (train={len(train_df)}, "
            f"val={len(val_df)}) — check TRAIN_CUTOFF against the data's actual "
            f"date range: {df['date'].min()} to {df['date'].max()}"
        )

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["label"]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df["label"]

    model = HistGradientBoostingClassifier(random_state=42)
    model.fit(X_train, y_train)

    val_proba = model.predict_proba(X_val)[:, 1]
    val_pred = (val_proba >= 0.5).astype(int)
    predicted_positive_rate = float(val_pred.mean())
    val_accuracy = accuracy_score(y_val, val_pred)

    logger.info(
        "train: %d train rows, %d val rows, val_accuracy=%.3f, predicted_positive_rate=%.3f",
        len(train_df), len(val_df), val_accuracy, predicted_positive_rate,
    )

    if not (SANE_BAND[0] <= predicted_positive_rate <= SANE_BAND[1]):
        logger.error(
            "train: REFUSING to save model — predicted_positive_rate=%.3f outside "
            "sane band %s (degenerate model, always predicting one class)",
            predicted_positive_rate, SANE_BAND,
        )
        sys.exit(1)

    joblib.dump(model, MODEL_PATH)
    logger.info("train: saved model to %s", MODEL_PATH)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train()
