# app/api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
import joblib
import pandas as pd
from pathlib import Path

# Load model
bundle = joblib.load(Path("app/model.joblib"))
pipeline = bundle["pipeline"]
features_used = bundle["features_used"]
target = bundle["target"]

# load meta
import json
with open("app/model_meta.json") as f:
    meta = json.load(f)

app = FastAPI(title="Housing Price Prediction API", version="1.0")


class HouseFeatures(BaseModel):
    square_footage: float = Field(..., example=1850)
    bedrooms: int = Field(..., ge=1, le=10, example=3)
    bathrooms: float = Field(..., ge=1, le=10, example=2)
    year_built: int = Field(..., ge=1900, le=2025, example=2000)
    lot_size: float = Field(..., example=7500)
    distance_to_city_center: float = Field(..., example=5.5)
    school_rating: float = Field(..., ge=0, le=10, example=8.2)


class PredictionResponse(BaseModel):
    predicted_price: int


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "loaded"}


@app.get("/model-info")
async def model_info():
    return {
        "target": target,
        "features_used": features_used,
        "train_samples": meta["n_samples"],
        "train_mae": round(meta["metrics_on_training_set"]["mae"]),
        "train_r2": round(meta["metrics_on_training_set"]["r2"], 4),
        "coefficients": {k: round(v, 2) for k, v in meta["coefficients"].items()},
        "top_features": [
            {"feature": name.replace("num__", ""), "impact": round(coef)}
            for name, coef in sorted(meta["coefficients"].items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        ]
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_single(house: HouseFeatures):
    df = pd.DataFrame([house.dict()])
    pred = pipeline.predict(df)[0]
    return {"predicted_price": int(pred)}


@app.post("/predict-batch", response_model=BatchPredictionResponse)
async def predict_batch(houses: List[HouseFeatures]):
    if not houses:
        raise HTTPException(400, "Empty batch")
    df = pd.DataFrame([h.dict() for h in houses])
    preds = pipeline.predict(df)
    return {"predictions": [{"predicted_price": int(p)} for p in preds]}
