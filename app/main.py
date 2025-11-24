# app/main.py
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Union
import joblib
import json
import os
import pandas as pd
from io import StringIO

# ==================== 環境變數設定 ====================
MODEL_FILE = os.environ.get("MODEL_FILE", "model.joblib")
META_FILE = os.environ.get("META_FILE", "model_meta.json")

app = FastAPI(
    title="HSBC Real Estate Price Prediction API",
    description="專業房價預測服務，支援單筆、批次與 CSV 上傳預測",
    version="1.0.0"
)

# ==================== 全域變數 ====================
model_pipeline = None
model_meta = None
original_features = []


@app.on_event("startup")
def load_model():
    global model_pipeline, model_meta, original_features

    if not os.path.exists(MODEL_FILE):
        raise RuntimeError(f"Model file not found: {MODEL_FILE}")

    bundle = joblib.load(MODEL_FILE)
    model_pipeline = bundle.get("pipeline") or bundle
    original_features = bundle.get("features_used") or bundle.get("features", [])

    if os.path.exists(META_FILE):
        with open(META_FILE, "r", encoding="utf-8") as f:
            model_meta = json.load(f)
    else:
        model_meta = {
            "original_features": original_features,
            "target": "price",
            "n_samples": 0
        }

    print(f"Model loaded successfully! Features: {original_features}")


# ==================== Pydantic Models ====================
class SingleInput(BaseModel):
    features: Dict[str, Any]

class BatchInput(BaseModel):
    items: List[Dict[str, Any]]


class PredictResponse(BaseModel):
    predictions: List[float]


# ==================== API Endpoints ====================
@app.get("/health")
def health():
    return {"status": "healthy", "message": "Model is ready!"}


@app.get("/model-info")
def model_info():
    if not model_meta:
        raise HTTPException(status_code=503, detail="Model metadata not loaded")

    coefficients = model_meta.get("coefficients", {})
    top5 = sorted(coefficients.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    return {
        "target": model_meta.get("target", "price"),
        "features_used": original_features,
        "training_samples": model_meta.get("n_samples", "unknown"),
        "train_mae": round(model_meta.get("metrics_on_training_set", {}).get("mae", 0)),
        "train_r2": round(model_meta.get("metrics_on_training_set", {}).get("r2", 0), 4),
        "coefficients_top5": [
            {"feature": name.replace("num__", "").replace("cat__", ""), "impact": round(coef)}
            for name, coef in top5
        ],
        "full_coefficients": {k.replace("num__", "").replace("cat__", ""): round(v, 2) for k, v in coefficients.items()},
        "intercept": round(model_meta.get("intercept", 0), 2) if model_meta.get("intercept") else None,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(payload: Union[SingleInput, BatchInput]):
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        items = payload.features if isinstance(payload, SingleInput) else payload.items
        if not items:
            raise ValueError("No data provided")
        
        df = pd.DataFrame([items] if isinstance(payload, SingleInput) else items)

        # 自動補齊缺失欄位 + 嚴格順序
        for col in original_features:
            if col not in df.columns:
                df[col] = 0
        df = df[original_features]

        preds = model_pipeline.predict(df)
        return {"predictions": [float(round(p)) for p in preds]}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")


@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="僅支援 CSV 檔案")

    try:
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode("utf-8-sig")))

        if df.empty:
            raise ValueError("CSV 檔案為空")

        # 補齊缺失欄位 + 嚴格順序
        for col in original_features:
            if col not in df.columns:
                df[col] = 0
        df = df[original_features]

        preds = model_pipeline.predict(df)
        result_df = df.copy()
        result_df.insert(0, "id", range(1, len(result_df) + 1))
        result_df["predicted_price"] = preds.astype(int)

        output_csv = result_df.to_csv(index=False, encoding="utf-8-sig")

        return StreamingResponse(
            iter([output_csv]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={file.filename.split('.')[0]}_with_prediction.csv"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV 處理失敗: {str(e)}")
