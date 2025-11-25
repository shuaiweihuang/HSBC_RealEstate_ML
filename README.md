# HSBC Real Estate Price Prediction System

A full-stack real estate price prediction application powered by machine learning, featuring a modern web interface and microservices architecture.

Built with  using FastAPI, Spring Boot, and Next.js

# Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Portal                         │
│                   (Next.js 14 + React)                      │
│                   Port: 3000                                │
└──────────────────┬──────────────────┬───────────────────────┘
                   │                  │
                   ▼                  ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   ML API         │  │   Java API       │
        │   (FastAPI)      │  │   (Spring Boot)  │
        │   Port: 8000     │  │   Port: 8080     │
        │   - Predictions  │  │   - Data Mgmt    │
        │   - Model Info   │  │   - Analytics    │
        └──────────────────┘  └──────────────────┘
```

# Features

Machine Learning API (Python/FastAPI)
- Single Property Prediction: Real-time price estimation
- Batch Prediction: Multiple properties at once
- CSV Upload & Download: Bulk predictions with downloadable results
- Model Explainability: Feature importance and coefficients
- Health Checks: Service monitoring endpoints

Java API (Spring Boot)
- Property data management
- Historical analytics
- RESTful endpoints

Frontend Portal (Next.js)
- Interactive Price Estimator: User-friendly form with real-time validation
- Responsive Design: Works on desktop, tablet, and mobile
- Modern UI: Tailwind CSS with HSBC branding
- Real-time Predictions: Instant results display

# Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- At least 4GB RAM available for containers

# Installation & Setup

1. Clone the Repository

```bash
git clone <repository-url>
cd HSBC_RealEstate
```

2. Project Structure

```
HSBC_RealEstate/
├── backend-python/           # ML API (FastAPI)
│   ├── app/
│   │   └── main.py          # API endpoints
│   ├── model.joblib         # Trained ML model
│   ├── model_meta.json      # Model metadata
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
│
├── backend-java/             # Java API (Spring Boot)
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile
│
├── frontend-portal/          # Next.js frontend
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx
│   │       └── estimator/
│   │           └── page.tsx
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml        # Container orchestration
```

3. Start All Services

```bash
- Build and start all containers
docker-compose up -d --build

- Check container status
docker-compose ps

- View logs
docker-compose logs -f
```

4. Access the Application

- Frontend Portal: http://localhost:3000
- Property Estimator: http://localhost:3000/estimator
- ML API: http://localhost:8000
- ML API Docs: http://localhost:8000/docs
- Java API: http://localhost:8080

# Usage

- Web Interface

1. Navigate to http://localhost:3000/estimator
2. Fill in property details:
   - Square Footage
   - Number of Bedrooms
   - Number of Bathrooms
   - Year Built
   - Lot Size
   - Distance to City Center (km)
   - School Rating (1-10)
3. Click "Estimate Property Value"
4. View the predicted price

- API Endpoints

# ML API (FastAPI)

Health Check
```bash
curl http://localhost:8000/health
```

Single Prediction
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "square_footage": 1850,
      "bedrooms": 3,
      "bathrooms": 2,
      "year_built": 2005,
      "lot_size": 8200,
      "distance_to_city_center": 4.8,
      "school_rating": 8.7
    }
  }'
```

- Model Information
```bash
curl http://localhost:8000/model-info
```

- CSV Batch Prediction
```bash
curl -X POST http://localhost:8000/predict-csv \
  -F "file=@properties.csv" \
  -o predictions.csv
```

# Java API

```bash
Example endpoint
curl http://localhost:8080/api/properties
```

# Configuration

ML API
- `MODEL_FILE`: Path to model file (default: `model.joblib`)
- `META_FILE`: Path to metadata file (default: `model_meta.json`)

Frontend
- API URLs are configured in the source code
- ML API: `http://localhost:8000`
- Java API: `http://localhost:8080`

Test ML API
```bash
# Health check
curl http://localhost:8000/health

Test prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {"square_footage": 2000, "bedrooms": 4, "bathrooms": 3, "year_built": 2010, "lot_size": 10000, "distance_to_city_center": 5.0, "school_rating": 9.0}}'
```

# Making Changes to ML API
```bash
# Edit backend-python/app/main.py
# Rebuild and restart
docker-compose down
docker-compose up -d --build ml-api
docker-compose logs -f ml-api
```

# Making Changes to Frontend
```bash
# Edit frontend-portal/src/app/estimator/page.tsx
# Clear cache and rebuild
rm -rf frontend-portal/.next
docker-compose down
docker-compose up -d --build portal
docker-compose logs -f portal
```

# Making Changes to Java API
```bash
# Edit backend-java source files
# Rebuild and restart
docker-compose down
docker-compose up -d --build java-api
docker-compose logs -f java-api
```

# Model Details

The machine learning model uses the following features:
- Square Footage
- Number of Bedrooms
- Number of Bathrooms
- Year Built
- Lot Size (sq ft)
- Distance to City Center (km)
- School Rating (1-10 scale)

Algorithm: Linear Regression with preprocessing pipeline

Performance Metrics: Available via `/model-info` endpoint
