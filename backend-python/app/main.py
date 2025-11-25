"""
HSBC Real Estate Price Prediction API
Production-ready FastAPI service with single/batch inference and CSV upload support.
"""

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Union
import joblib
import json
import os
import pandas as pd
from io import StringIO
import numpy as np 
from pathlib import Path


# Configuration via environment variables (production-ready)
MODEL_FILE = os.environ.get("MODEL_FILE", "model.joblib")
META_FILE = os.environ.get("META_FILE", "model_meta.json")
CURRENT_YEAR = 2025 # Must match the year used during training

app = FastAPI(
    title="HSBC Real Estate Price Prediction API",
    description="Production-grade house price prediction service supporting single, batch, and CSV inference.",
    version="1.0.0",
    openapi_tags=[
        {"name": "health", "description": "Service health checks"},
        {"name": "model", "description": "Model information and explainability"},
        {"name": "inference", "description": "Prediction endpoints"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
model_pipeline = None
model_meta: Dict[str, Any] = {}
original_features: List[str] = []
target: str = "price" 

@app.on_event("startup")
def load_model() -> None:
    """Load trained model and metadata at startup."""
    global model_pipeline, model_meta, original_features, target
    
    try:
        # Load model bundle
        bundle = joblib.load(Path(MODEL_FILE))
        model_pipeline = bundle["pipeline"]
        original_features = bundle["features_used"]
        target = bundle["target"]
        
        # Load meta
        with open(META_FILE, encoding="utf-8") as f:
            model_meta = json.load(f)
            
        print(f"Model and metadata loaded successfully. Features: {original_features}")

    except Exception as e:
        print(f"Error loading model or metadata: {e}")
        model_pipeline = None


class HouseFeatures(BaseModel):
    square_footage: float = Field(..., example=1850)
    bedrooms: int = Field(..., ge=1, le=10, example=3)
    bathrooms: float = Field(..., ge=1, le=10, example=2)
    # Receive year_built from the user
    year_built: int = Field(..., ge=1900, le=CURRENT_YEAR, example=2000) 
    lot_size: float = Field(..., example=7500)
    distance_to_city_center: float = Field(..., example=5.5)
    school_rating: float = Field(..., ge=0, le=10, example=8.2)


class PredictionResponse(BaseModel):
    predicted_price: int


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]


def preprocess_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Performs feature engineering: converts 'year_built' to 'age_of_house',
    and ensures the output DataFrame columns match the features the model expects.
    """
    if "year_built" in df.columns:
        # 1. Convert to age of house
        df["age_of_house"] = CURRENT_YEAR - df["year_built"]
        
        # 2. Remove year_built (which the model does not expect)
        df = df.drop(columns=["year_built"], errors='ignore')
        
    # 3. Ensure column order and presence match the model's expected features
    # Note: original_features now contains 'age_of_house' and not 'year_built'
    
    # Simple check for missing columns (shouldn't happen with Pydantic for single/batch, but good for CSV)
    missing_cols = set(original_features) - set(df.columns)
    for col in missing_cols:
        # This part should be handled carefully, assuming inputs provide all needed features
        df[col] = np.nan 
        
    return df[original_features]


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy", "model": "loaded" if model_pipeline else "not loaded"}


@app.get("/model-info", tags=["model"])
async def model_info():
    if not model_meta:
        raise HTTPException(status_code=503, detail="Model metadata not loaded")

    # Extract test set metrics for a more honest assessment
    test_metrics = model_meta.get("metrics_on_test_set", {})
    
    return {
        "target": target,
        "features_used": original_features,
        "n_samples": model_meta["n_samples"],
        "train_samples": model_meta.get("train_samples"),
        "test_samples": model_meta.get("test_samples"),
        "train_mae": round(model_meta["metrics_on_training_set"]["mae"]),
        "test_mae": round(test_metrics.get("mae", -1)),
        "train_r2": round(model_meta["metrics_on_training_set"]["r2"], 4),
        "test_r2": round(test_metrics.get("r2", -1), 4),
        "coefficients": {k: round(v, 2) for k, v in model_meta["coefficients"].items()},
        "top_features": [
            {"feature": name.replace("num__", ""), "impact": round(coef)}
            for name, coef in sorted(model_meta["coefficients"].items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        ]
    }


@app.post("/predict", response_model=PredictionResponse, tags=["inference"])
async def predict_single(house: HouseFeatures):
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    # 1. Convert to DataFrame
    df = pd.DataFrame([house.dict()])
    
    # 2. Feature Engineering: Convert to age of house
    X = preprocess_features(df)
    
    # 3. Predict
    pred = model_pipeline.predict(X)[0]
    return {"predicted_price": int(np.round(pred))}


@app.post("/predict-batch", response_model=BatchPredictionResponse, tags=["inference"])
async def predict_batch(houses: List[HouseFeatures]):
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # 1. Convert to DataFrame
    df = pd.DataFrame([h.dict() for h in houses])
    
    # 2. Feature Engineering: Convert to age of house
    X = preprocess_features(df)
    
    # 3. Predict
    predictions = model_pipeline.predict(X)
    
    return {"predictions": [{"predicted_price": int(np.round(p))} for p in predictions]}


@app.post("/predict-csv", tags=["inference"])
async def predict_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file and receive predictions with original data.
    Returns a downloadable CSV with added 'predicted_price' column.
    """
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode("utf-8-sig")))

        if df.empty:
            raise ValueError("Uploaded CSV is empty")

        # 1. Feature Engineering: Convert to age of house and align columns
        # We pass a copy to preprocess_features to avoid modifying the original df 
        # before the result_df copy.
        X = preprocess_features(df.copy()) 

        # 2. Predict
        predictions = model_pipeline.predict(X)
        
        # 3. Prepare result DataFrame (use original df features, but add predicted price)
        result_df = df.copy()
        
        if 'id' not in result_df.columns:
            # Insert ID if not present
            result_df.insert(0, "id", range(1, len(result_df) + 1))
            
        result_df["predicted_price"] = predictions.astype(int)

        output_csv = result_df.to_csv(index=False, encoding="utf-8-sig")

        return StreamingResponse(
            iter([output_csv]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={file.filename.split('.')[0]}_with_prediction.csv"
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
