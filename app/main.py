"""
HSBC Real Estate Price Prediction API
Production-ready FastAPI service with single/batch inference and CSV upload support.
"""

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Union
import joblib
import json
import os
import pandas as pd
from io import StringIO


# Configuration via environment variables (production-ready)
MODEL_FILE = os.environ.get("MODEL_FILE", "model.joblib")
META_FILE = os.environ.get("META_FILE", "model_meta.json")

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

# Global state
model_pipeline = None
model_meta: Dict[str, Any] = {}
original_features: List[str] = []


@app.on_event("startup")
def load_model() -> None:
    """Load trained model and metadata at startup."""
    global model_pipeline, model_meta, original_features

    if not os.path.exists(MODEL_FILE):
        raise RuntimeError(f"Model file not found: {MODEL_FILE}")

    # Load model bundle
    bundle = joblib.load(MODEL_FILE)
    model_pipeline = bundle.get("pipeline") or bundle
    original_features = bundle.get("features_used") or bundle.get("features", [])

    # Load metadata
    if os.path.exists(META_FILE):
        with open(META_FILE, "r", encoding="utf-8") as f:
            model_meta = json.load(f)
    else:
        model_meta = {
            "target": "price",
            "n_samples": 0,
            "features_used": original_features,
        }

    print(f"Model loaded successfully | Features: {len(original_features)} → {original_features}")


# === Pydantic Schemas ===
class SingleInput(BaseModel):
    features: Dict[str, Any]


class BatchInput(BaseModel):
    items: List[Dict[str, Any]]


class PredictResponse(BaseModel):
    predictions: List[float]


# === Health & Model Info ===
@app.get("/health", tags=["health"])
def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "message": "Model is loaded and ready"}


@app.get("/model-info", tags=["model"])
def model_information() -> Dict[str, Any]:
    """Return model metadata, performance metrics, and top feature impacts."""
    if not model_meta:
        raise HTTPException(status_code=503, detail="Model metadata not available")

    coefficients = model_meta.get("coefficients", {})
    top5 = sorted(coefficients.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    return {
        "target": model_meta.get("target", "price"),
        "features_used": original_features,
        "training_samples": model_meta.get("n_samples", "unknown"),
        "train_mae": round(model_meta.get("metrics_on_training_set", {}).get("mae", 0)),
        "train_r2": round(model_meta.get("metrics_on_training_set", {}).get("r2", 0), 4),
        "top5_impact_features": [
            {
                "feature": name.replace("num__", "").replace("cat__", ""),
                "impact": round(coef)
            }
            for name, coef in top5
        ],
        "full_coefficients": {
            k.replace("num__", "").replace("cat__", ""): round(v, 2)
            for k, v in coefficients.items()
        },
        "intercept": round(model_meta.get("intercept", 0), 2) if model_meta.get("intercept") else None,
    }


# === Inference Endpoints ===
@app.post("/predict", response_model=PredictResponse, tags=["inference"])
def predict(payload: Union[SingleInput, BatchInput]):
    """
    Predict house prices for single or multiple records.
    Supports both single object and batch array input.
    """
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Normalize input: always work with list of records (fixes pandas scalar issue)
        if isinstance(payload, SingleInput):
            records = [payload.features]
        else:
            records = payload.items

        if not records:
            raise ValueError("No prediction data provided")

        df = pd.DataFrame(records)

        # Ensure feature completeness and order
        for col in original_features:
            if col not in df.columns:
                df[col] = 0
        df = df[original_features]

        predictions = model_pipeline.predict(df)
        return {"predictions": [float(round(p)) for p in predictions]}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")


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

        # Align with training features
        for col in original_features:
            if col not in df.columns:
                df[col] = 0
        df = df[original_features]

        predictions = model_pipeline.predict(df)
        result_df = df.copy()
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
        raise HTTPException(status_code=400, detail=f"CSV processing failed: {str(e)}")
