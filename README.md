# HSBC Real Estate Price Prediction System

A full-stack real estate price prediction application powered by machine learning, featuring a modern web interface and microservices architecture.

Built with using FastAPI, Spring Boot, and Next.js

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


**Architecture Note:** Frontend prediction requests (`/api/properties/what-if`) are proxied through the Next.js server, then routed to the Java API, which finally calls the Python ML API.

# Features

### Machine Learning API (Python/FastAPI)
- Single Property Prediction: Real-time price estimation
- Batch Prediction: Multiple properties at once
- CSV Upload & Download: Bulk predictions with downloadable results
- Model Explainability: Feature importance and coefficients
- Health Checks: Service monitoring endpoints
- **Advanced Feature Engineering:** Internally uses **15 engineered features** (derived from 7 raw inputs) for improved prediction accuracy.

### Java API (Spring Boot)
- Property data management
- Historical analytics
- **ML Prediction Orchestration:** Acts as a broker between the frontend and the Python ML API.
- RESTful endpoints

### Frontend Portal (Next.js)
- **Interactive Price Estimator:** User-friendly form with real-time validation at `/estimator`.
- Responsive Design: Works on desktop, tablet, and mobile
- Modern UI: Tailwind CSS with HSBC branding

# Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- At least 4GB RAM available for containers

# Installation & Setup

1. Clone the Repository

```bash
git clone <repository-url>
cd HSBC_RealEstate
Project Structure

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
│   │       ├── api/properties/what-if/route.ts # Next.js Proxy
│   │       ├── historical-analysis/page.tsx    # Historical Analysis
│   │       ├── market-analysis/page.tsx        # Price Estimator for Java
│   │       └── estimator/page.tsx              # Price Estimator for Python
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml        # Container orchestration
Start All Services

Bash

- Build and start all containers
docker-compose up -d --build

- Check container status
docker-compose ps

- View logs
docker-compose logs -f
Access the Application

Frontend Portal: http://localhost:3000

Property Estimator: http://localhost:3000/estimator

ML API Docs: http://localhost:8000/docs

Java API: http://localhost:8080

MODEL_FILE: Path to model file (default: model.joblib)

META_FILE: Path to metadata file (default: model_meta.json)

Algorithm: Ridge Regression with a robust preprocessing pipeline.

Performance Metrics: Available via /model-info endpoint
