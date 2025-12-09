# ----------------------------------------
# 階段 1: BUILDER STAGE (模型訓練與依賴安裝)
# ----------------------------------------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ /app/
RUN mkdir -p data/raw
COPY data/raw/HousePriceDataset.csv data/raw/HousePriceDataset.csv

RUN python hpml_train.py \
    --data data/raw/HousePriceDataset.csv \
    --model model.joblib \
    --meta model_meta.json


# ----------------------------------------
# 階段 2: FINAL STAGE (運行鏡像，不包含資料集)
# ----------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/. /app/
COPY --from=builder /app/model.joblib ./app/model.joblib
COPY --from=builder /app/model_meta.json ./app/model_meta.json

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
