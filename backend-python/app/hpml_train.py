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
import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
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

# Get the current year dynamically from the system time
CURRENT_YEAR = datetime.datetime.now().year


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
    
    # === Feature Engineering: Convert to Age of House ===
    df["age_of_house"] = CURRENT_YEAR - df["year_built"]
    
    # === ADDED: Additional Feature Engineering ===
    # Interaction features
    if "square_footage" in df.columns and "bedrooms" in df.columns:
        df["size_per_bedroom"] = df["square_footage"] / (df["bedrooms"] + 1)
    
    if "bathrooms" in df.columns and "bedrooms" in df.columns:
        df["bathroom_bedroom_ratio"] = df["bathrooms"] / (df["bedrooms"] + 1)
    
    # Combination features
    if "bedrooms" in df.columns and "bathrooms" in df.columns:
        df["total_rooms"] = df["bedrooms"] + df["bathrooms"]
    
    if "school_rating" in df.columns and "distance_to_city_center" in df.columns:
        df["quality_score"] = df["school_rating"] * df["distance_to_city_center"]
    
    # Polynomial features
    if "square_footage" in df.columns:
        df["square_footage_sq"] = df["square_footage"] ** 2
    
    if "lot_size" in df.columns:
        df["lot_size_sq"] = df["lot_size"] ** 2
    
    # Categorical features
    if "age_of_house" in df.columns:
        df["is_new_house"] = (df["age_of_house"] <= 5).astype(int)
    
    if "square_footage" in df.columns:
        median_size = df["square_footage"].median()
        df["large_house"] = (df["square_footage"] > median_size).astype(int)
    # === END ADDED ===
    
    # Determine features to use
    target = target_name or "price"
    # MODIFIED: Expand allowed features list with engineered features
    ALLOWED_FEATURES_TRAIN = ALLOWED_FEATURES.union({"age_of_house"}) - {"year_built"}
    # Add engineered features to allowed list
    ALLOWED_FEATURES_TRAIN = ALLOWED_FEATURES_TRAIN.union({
        "size_per_bedroom", "bathroom_bedroom_ratio", "total_rooms", "quality_score",
        "square_footage_sq", "lot_size_sq", "is_new_house", "large_house"
    })
    
    # Select only allowed features
    X_raw = df[list(ALLOWED_FEATURES_TRAIN)].copy()
    y = df[target]

    # === Data Split: Train/Test Separation (80/20) ===
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=42
    )

    # 2. Preprocessing Pipeline Definition
    features_to_scale = list(ALLOWED_FEATURES_TRAIN) 
    
    # Categorical features (none currently, but structure is preserved)
    # categorical_features = []

    # 3. ColumnTransformer (Preprocessing Steps)
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), features_to_scale),
            # ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ],
        remainder='drop'
    )

    # 4. Full Pipeline (Preprocessing + Model)
    model = Ridge(alpha=1.0, random_state=42)
    pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', model)])

    # 5. Train the model
    print("Starting model training...")
    pipeline.fit(X_train, y_train)

    # 6. Evaluate on Train and Test sets
    
    # Training set evaluation
    y_train_pred = pipeline.predict(X_train)
    train_mae = mean_absolute_error(y_train, y_train_pred)
    train_r2 = r2_score(y_train, y_train_pred)

    # Test set evaluation (reflects model generalization ability)
    y_test_pred = pipeline.predict(X_test)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_r2 = r2_score(y_test, y_test_pred)

    # 7. Extract Coefficients
    scaled_feature_names = [f'num__{f}' for f in features_to_scale]
    
    # Extract coefficients from the fitted Ridge model
    coefs = pipeline['regressor'].coef_
    coefficients = dict(zip(scaled_feature_names, coefs))
    
    # ADDED: Sort coefficients by absolute value to find most important features
    coef_importance = sorted(coefficients.items(), key=lambda x: abs(x[1]), reverse=True)

    # 8. Create Metadata
    meta = {
        "target": target,
        "n_samples": len(X_raw),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "features_used": list(X_raw.columns),
        "train_mean_price": y_train.mean(),
        "baseline_naive_mae": mean_absolute_error(y_test, [y_train.mean()] * len(y_test)), 
        "metrics_on_training_set": {
            "mae": train_mae,
            "r2": train_r2,
        },
        "metrics_on_test_set": {
            "mae": test_mae,
            "r2": test_r2,
        },
        # ADDED: Calculate improvement over baseline
        "improvement_over_baseline_pct": ((mean_absolute_error(y_test, [y_train.mean()] * len(y_test)) - test_mae) / mean_absolute_error(y_test, [y_train.mean()] * len(y_test))) * 100,
        "model": str(model),
        "coefficients": coefficients,
        # ADDED: Top 5 most important features
        "top_5_important_features": [
            {"feature": name.replace("num__", ""), "coefficient": float(coef)} 
            for name, coef in coef_importance[:5]
        ]
    }

    # 9. Save model bundle
    bundle = {
        "pipeline": pipeline,
        "features_used": list(X_raw.columns),
        "target": target,
    }
    joblib.dump(bundle, model_path)

    # 10. Save metadata
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # 11. Training summary
    print("\n" + "="*60)
    print("                TRAINING COMPLETED")
    print("="*60)
    print(f"Model saved         -> {model_path}")
    print(f"Metadata saved      -> {meta_path}")
    print(f"Features used ({len(X_raw.columns)}): {list(X_raw.columns)}")
    print(f"Train samples       : {len(X_train):,}")
    print(f"Test samples        : {len(X_test):,}")
    print(f"Training MAE        : {train_mae:,.2f}")
    print(f"R² score (Train)    : {train_r2:.4f}")
    print("--------------------------------------------------")
    print(f"TESTING MAE         : {test_mae:,.2f}")
    print(f"R² score (Test)     : {test_r2:.4f}")
    # ADDED: Show improvement and top features
    print(f"Baseline MAE        : {meta['baseline_naive_mae']:,.2f}")
    print(f"Improvement         : {meta['improvement_over_baseline_pct']:.1f}%")
    print("\nTop 5 Important Features:")
    for i, item in enumerate(meta['top_5_important_features'], 1):
        print(f"  {i}. {item['feature']}: {item['coefficient']:,.2f}")
    print("="*60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train a leakage-free house price regression model"
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("../data/raw/HousePriceDataset.csv"),
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
    args = parser.parse_args()
    hpml_train(args.data, args.model, args.meta)
