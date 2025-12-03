from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import pandas as pd

app = FastAPI(
    title="Geo-Data API",
    description="API para análisis geoespacial y temporal",
    version="0.1.0"
)

# CORS para conectar con frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5180"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint raíz
@app.get("/")
async def root():
    return {
        "message": "Geo-Data API running",
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Datasets disponibles
@app.get("/api/datasets")
async def get_datasets():
    datasets = [
        {"id": "covid-spain", "name": "COVID España", "type": "geo-temporal"},
        {"id": "elections", "name": "Resultados Electorales", "type": "geo"},
        {"id": "housing-prices", "name": "Precios Vivienda", "type": "geo-temporal"},
    ]
    return {"datasets": datasets}

# Datos demo COVID
@app.get("/api/data/covid")
async def get_covid_data():
    # Datos demo
    data = [
        {"fecha": "2023-01-01", "comunidad": "Madrid", "casos": 1500, "lat": 40.4168, "lon": -3.7038},
        {"fecha": "2023-01-01", "comunidad": "Cataluña", "casos": 1800, "lat": 41.3851, "lon": 2.1734},
        {"fecha": "2023-01-02", "comunidad": "Madrid", "casos": 1600, "lat": 40.4168, "lon": -3.7038},
        {"fecha": "2023-01-02", "comunidad": "Cataluña", "casos": 1900, "lat": 41.3851, "lon": 2.1734},
        {"fecha": "2023-01-03", "comunidad": "Madrid", "casos": 1550, "lat": 40.4168, "lon": -3.7038},
        {"fecha": "2023-01-03", "comunidad": "Cataluña", "casos": 1850, "lat": 41.3851, "lon": 2.1734},
    ]
    return {"data": data}

# Análisis simple demo
@app.get("/api/analysis/summary")
async def get_analysis():
    # Simulación análisis con pandas
    df = pd.DataFrame({
        "comunidad": ["Madrid", "Cataluña", "Andalucía", "Valencia"],
        "casos_totales": [4650, 5550, 3200, 2800],
        "tendencia": ["estable", "subiendo", "bajando", "estable"]
    })
    
    summary = df.describe().to_dict()
    
    return {
        "summary": summary,
        "total_cases": df["casos_totales"].sum(),
        "average_cases": df["casos_totales"].mean(),
        "top_region": df.loc[df["casos_totales"].idxmax()].to_dict()
    }
