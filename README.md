# Housing Price Prediction Model API

A minimal FastAPI service that serves a scikit-learn regression pipeline for predicting housing prices.

## Features
- `/predict` – single or batch predictions via JSON
- `/predict-csv` – upload a CSV file and get predictions (with original columns + `predicted_price`)
- `/model-info` – model coefficients, intercept, training metrics and feature list
- `/health` – simple health check endpoint
- Interactive documentation:  
  - Swagger UI → `/docs`  

## Requirements
- Python 3.12+
- Docker (optional but recommended)

## Quickstart (local)

1. Prepare dataset
   Place your training CSV at `data/raw/HousePriceDataset.csv`.
   The dataset must contain a target column named `price` (or specify another name with `--target`).

2. Create a virtual environment & install dependencies
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

3. Train the model
```bash
./train.sh
# or directly
python -m app.hpml_train --data data/raw/HousePriceDataset.csv

4. Run the API
uvicorn app.main:app --reload
The service will be available at http://127.0.0.1:8000
