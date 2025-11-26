# 使用 Python 3.12 基礎鏡像
FROM python:3.12-slim

# 設定環境變數
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 設定工作目錄
WORKDIR /app

# 1. 安裝系統依賴：curl 用於 healthcheck
RUN apt-get update && \
    apt-get install -y curl build-essential && \
    rm -rf /var/lib/apt/lists/*

# 2. 複製並安裝 Python 依賴
COPY requirements.txt .
# 安裝依賴 (包含 scikit-learn 等，需要 build-essential)
RUN pip install --no-cache-dir -r requirements.txt

# 3. 複製應用程式程式碼和資料
# 複製 app/ (包含 api.py, main.py, hpml_train.py, evaluate.py)
COPY app/. /app/
# 複製資料 (data/raw/HousePriceDataset.csv)
# 假設您的資料集位於 backend-python/data/raw/HousePriceDataset.csv
RUN mkdir -p data/raw
COPY data/raw/HousePriceDataset.csv data/raw/HousePriceDataset.csv

# 4. 執行模型訓練步驟 (新增: 產生 model.joblib 和 model_meta.json)
# 這裡執行 hpml_train.py，將模型輸出到 app/model.joblib 和 app/model_meta.json
# 由於目前的工作目錄是 /app，腳本路徑為 hpml_train.py
RUN python -m hpml_train \
    --data data/raw/HousePriceDataset.csv \
    --model model.joblib \
    --meta model_meta.json

# 5. 暴露端口
EXPOSE 8000

# 6. 啟動應用程式
# 服務現在應該能夠順利載入 model.joblib 和 model_meta.json
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
