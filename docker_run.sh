#!/bin/bash
# docker_run.sh - Fixed version

find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

echo "Building Docker image..."
docker build --no-cache -t hsbc-price-api .

echo "Starting container..."
docker run -p 8000:8000 hsbc-price-api
