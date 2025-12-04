# evaluate.py
"""
Prediction-only evaluation script.
Loads the trained model and generates predictions on new data.
No ground truth required — designed for inference/demo use cases.
"""

import joblib
import json
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, r2_score
import datetime # Added: Import the datetime module

# Get the current year dynamically from the system time
CURRENT_YEAR = datetime.datetime.now().year # Changed: Dynamically set current year


def preprocess_features(df: pd.DataFrame) -> pd.DataFrame:
    
    # 1. Age of house
    if "year_built" in df.columns:
        df["age_of_house"] = CURRENT_YEAR - df["year_built"]
        df = df.drop(columns=["year_built"], errors='ignore') # Removed year_built here
        
    # 2. Replicate Additional Feature Engineering from hpml_train.py
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
        median_size = df["square_footage"].median() # NOTE: This uses the median of the PREDICTION data, which is acceptable in this case as it's not a scaling/transformation fit
        df["large_house"] = (df["square_footage"] > median_size).astype(int)
        
    return df

def evaluate(data_path: Path) -> None:
    """
    Run inference on a new dataset using the trained model.
    
    Args:
        data_path: Path to CSV containing features for prediction
    """
    model_path = Path("app/model.joblib")
    meta_path = Path("app/model_meta.json")

    # 1. Load trained model bundle
    bundle = joblib.load(model_path)
    pipeline = bundle["pipeline"]
    features_used = bundle.get("features_used") or bundle.get("features", [])
    target = bundle.get("target", "price")

    print(f"Loading model trained on {len(features_used)} features: {features_used}")

    # 2. Load prediction dataset
    df = pd.read_csv(data_path)
    
    # 3. Feature Engineering: Convert to age of house
    df_processed = preprocess_features(df.copy())
    
    # 4. Prepare prediction feature set X
    # Ensure feature set X only contains the columns the model requires
    X = df_processed[features_used] 

    # 5. Generate predictions
    preds = pipeline.predict(X)

    # 6. Load baseline from training metadata
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    train_mean_price = meta["train_mean_price"]

    # 7. Print summary report
    print("\n" + "="*60)
    print("               PREDICTION-ONLY MODE")
    print("="*60)
    print(f"Number of input records      : {len(df):,}")
    print(f"Features used                : {features_used}")
    print(f"Training set mean price      : {train_mean_price:,.0f}")
    print(f"Predicted mean price         : {preds.mean():,.0f}")
    print(f"Predicted price range        : {preds.min():,.0f} ~ {preds.max():,.0f}")
    print("="*60)

    # 8. Export results with predicted prices
    output_path = Path("data/processed/Prediction_Result_with_price.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Use original df columns, and add predicted price
    result_df = df.copy() 
    
    if 'id' not in result_df.columns:
        result_df.insert(0, "id", range(1, len(result_df) + 1))
        
    result_df["predicted_price"] = preds.astype(int)

    result_df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\nPrediction completed!")
    print(f"Results saved to:")
    print(f"   -> {output_path.resolve()}")
    print(f"   Total predictions: {len(result_df):,} records")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate predictions on new data using the trained model"
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/raw/HousePriceDataset.csv"),
        help="Path to dataset for prediction (CSV)"
    )
    args = parser.parse_args()
    evaluate(args.data)
