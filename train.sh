python -m app.hpml_train \
    --data data/raw/HousePriceDataset.csv \
    --model app/model.joblib \
    --meta app/model_meta.json

python -m app.evaluate
