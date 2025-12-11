# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html
from datetime import datetime
import pandas as pd

# Importar routers
from app.routers.covid import router as covid_router
from app.routers.weather import router as weather_router
from app.routers.elections import router as elections_router
from app.routers.air_quality import router as air_quality_router
from app.routers.housing import router as housing_router

app = FastAPI(
    title="Geo-Data API",
    description="API para análisis geoespacial y temporal",
    version="0.1.0",
    docs_url=None,
    redoc_url=None
)

# CORS para conectar con frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5180", "http://localhost:8180"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(covid_router)
app.include_router(weather_router)
app.include_router(elections_router)
app.include_router(air_quality_router)
app.include_router(housing_router)

# Endpoints generales (comunes a todos)
@app.get("/")
async def root():
    return {
        "message": "Geo-Data API running",
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api")
async def api_root():
    return await root()

@app.get("/api/openapi.json", include_in_schema=False)
async def get_openapi():
    return app.openapi()

@app.get("/api/docs", include_in_schema=False)
async def api_docs():
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title="Geo-Data API Documentation"
    )

# Datasets disponibles
@app.get("/api/datasets")
async def get_datasets():
    datasets = [
        {"id": "covid", "name": "COVID España", "type": "geo-temporal"},
        {"id": "weather", "name": "Clima España", "type": "geo-temporal"},
        {"id": "elections", "name": "Resultados Electorales", "type": "geo"},
        {"id": "airquality", "name": "Calidad del Aire", "type": "geo-temporal"},
        {"id": "housing", "name": "Precios Vivienda", "type": "geo-temporal"}
    ]
    return {"datasets": datasets}

# Análisis simple demo (mantener por ahora o mover a routers/)
@app.get("/api/analysis/summary")
async def get_analysis():
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