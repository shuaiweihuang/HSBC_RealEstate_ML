"""
House Price ML – Train a clean, production-ready regression model

Strictly prevents data leakage by:
- Hard-coded allow-list of business-meaningful features only
- Automatic detection and removal of ID-like columns
- No train-test contamination

Allowed features:
    square_footage, bedrooms, bathrooms, year_built,
    lot_size, distance_to_city_center, school_rating
"""

import argparse
import json
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# Business-approved feature allow-list (prevents ID leakage)
ALLOWED_FEATURES = {
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
}


def hpml_train(
    data_path: Path,
    model_path: Path,
    meta_path: Path,
    target_name: Optional[str] = None,
) -> None:
    """
    Train a leakage-free Ridge regression model on housing data.

    Args:
        data_path: Path to training CSV
        model_path: Where to save the trained joblib bundle
        meta_path: Where to save training metadata and coefficients
        target_name: Optional override for target column name
    """
    # 1. Load dataset
    df = pd.read_csv(data_path)

    if df.shape[0] < 10:
        raise ValueError("Dataset must contain at least 10 samples for training.")

    # 2. Auto-detect target column
    if target_name and target_name in df.columns:
        target = target_name
    elif "price" in df.columns:
        target = "price"
    elif "sale_price" in df.columns:
        target = "sale_price"
    else:
        target = df.columns[-1]  # fallback
        print(f"[Info] Target column not found, using last column as target: '{target}'")

    y = df[target].astype(float)

    # 3. Select only allowed business features that exist in data
    available_features = [col for col in ALLOWED_FEATURES if col in df.columns]
    missing_features = ALLOWED_FEATURES - set(available_features)

    if missing_features:
        print(f"[Warning] Missing requested features (will be ignored): {missing_features}")

    if not available_features:
        raise ValueError("No allowed features found in dataset!")

    X_raw = df[available_features].copy()

    # 4. Double-safety: drop any column that smells like an ID (defense in depth)
    forbidden_patterns = {"id", "index", "row", "listing", "mls"}
    leaked = [
        col for col in X_raw.columns
        if any(pattern in col.lower() for pattern in forbidden_patterns)
    ]
    if leaked:
        print(f"[Security] Auto-dropping forbidden ID-like columns: {leaked}")
        X_raw = X_raw.drop(columns=leaked)

    # 5. Separate numeric and categorical columns (all numeric now, but future-proof)
    numeric_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = X_raw.select_dtypes(exclude=[np.number]).columns.tolist()

    # 6. Build preprocessing pipeline
    numeric_transformer = Pipeline(steps=[("scaler", StandardScaler())])

    categorical_transformer = Pipeline(steps=[
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ],
        sparse_threshold=0,  # Always return dense array
    )

    # 7. Final training pipeline
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", Ridge(alpha=1.0, random_state=42)),
    ])

    # 8. Train and evaluate on full training set (for reporting & explainability)
    pipeline.fit(X_raw, y)
    preds = pipeline.predict(X_raw)

    mae = float(mean_absolute_error(y, preds))
    r2 = float(r2_score(y, preds))
    train_mean_price = float(y.mean())
    naive_mae = float(mean_absolute_error(y, np.full_like(y, train_mean_price)))

    # 9. Extract feature coefficients for business interpretability
    coef_map = {}
    intercept = None
    try:
        feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
        coefs = pipeline.named_steps["model"].coef_
        intercept = float(pipeline.named_steps["model"].intercept_)

        for name, coef in zip(feature_names, coefs):
            coef_map[name] = float(coef)

        # Show top 10 most impactful features
        top10 = sorted(coef_map.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
        print("\nTop 10 feature coefficients (absolute impact):")
        for name, coef in top10:
            print(f"   {name:<35}: {coef:+8.2f}")
    except Exception as e:
        print(f"[Warning] Failed to extract coefficients: {e}")

    # 10. Save model + rich metadata
    joblib.dump({
        "pipeline": pipeline,
        "features_used": X_raw.columns.tolist(),
        "target": target,
    }, model_path)

    meta = {
        "target": target,
        "n_samples": int(df.shape[0]),
        "features_used": X_raw.columns.tolist(),
        "train_mean_price": train_mean_price,
        "baseline_naive_mae": naive_mae,
        "metrics_on_training_set": {
            "mae": mae,
            "r2": r2,
            "rmse": float(np.sqrt(((y - preds) ** 2).mean())),
        },
        "model": "Ridge(alpha=1.0, random_state=42)",
        "coefficients": coef_map,
        "intercept": intercept,
        "training_date_utc": pd.Timestamp("now", tz="UTC").isoformat(),
    }

    meta_path.parent.mkdir(parents=True, exist_ok=True)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # 11. Training summary
    print("\n" + "="*60)
    print("                TRAINING COMPLETED")
    print("="*60)
    print(f"Model saved         → {model_path}")
    print(f"Metadata saved      → {meta_path}")
    print(f"Features used ({len(X_raw.columns)}): {list(X_raw.columns)}")
    print(f"Training MAE        : {mae:,.2f}")
    print(f"R² score            : {r2:.4f}")
    print(f"Naive baseline MAE  : {naive_mae:,.0f}")
    print(f"Improvement         : {naive_mae - mae:,.0f} ({(naive_mae - mae)/naive_mae:.1%})")
    print("="*60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train a leakage-free house price regression model"
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/raw/HousePriceDataset.csv"),
        help="Path to training dataset (CSV)"
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("app/model.joblib"),
        help="Output path for trained model"
    )
    parser.add_argument(
        "--meta",
        type=Path,
        default=Path("app/model_meta.json"),
        help="Output path for training metadata"
    )
    parser.add_argument(
        "--target",
        type=str,
        default=None,
        help="Target column name (default: auto-detect 'price' or 'sale_price')"
    )
    args = parser.parse_args()

    hpml_train(args.data, args.model, args.meta, args.target)
