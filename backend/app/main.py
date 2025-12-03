from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html
from sqlalchemy.orm import Session  # <-- SOLO Session
from sqlalchemy import func  # <-- func por separado
from datetime import datetime
import pandas as pd
import json

from app.database import get_db
from app.models import CovidCase

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

# Endpoint /api para redirigir a la raíz
@app.get("/api")
async def api_root():
    return await root()

# Endpoint para OpenAPI spec en /api/openapi.json
@app.get("/api/openapi.json", include_in_schema=False)
async def get_openapi():
    return app.openapi()

# Endpoint /api/docs para Swagger
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
        {"id": "covid-spain", "name": "COVID España", "type": "geo-temporal"},
        {"id": "elections", "name": "Resultados Electorales", "type": "geo"},
        {"id": "housing-prices", "name": "Precios Vivienda", "type": "geo-temporal"},
    ]
    return {"datasets": datasets}

# Datos COVID desde BD
@app.get("/api/data/covid")
async def get_covid_data(db: Session = Depends(get_db)):
    try:
        # Obtener todos los casos
        cases = db.query(CovidCase).order_by(CovidCase.fecha, CovidCase.comunidad_autonoma).all()
        
        # Convertir a formato para frontend
        result = []
        for case in cases:
            # Extraer coordenadas del punto geométrico
            point_data = db.scalar(case.geom.ST_AsGeoJSON())
            if point_data:
                coords = json.loads(point_data)["coordinates"]
                lon, lat = coords[0], coords[1]
            else:
                lat, lon = None, None
            
            result.append({
                "fecha": str(case.fecha),
                "comunidad": case.comunidad_autonoma,
                "casos": case.casos_confirmados,
                "ingresos_uci": case.ingresos_uci,
                "fallecidos": case.fallecidos,
                "altas": case.altas,
                "lat": lat,
                "lon": lon
            })
        
        return {"data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos: {str(e)}")

# Estadísticas COVID
@app.get("/api/covid/stats")
async def get_covid_stats(db: Session = Depends(get_db)):
    """Estadísticas agregadas de COVID"""
    try:
        # Total casos por comunidad
        total_por_comunidad = db.query(
            CovidCase.comunidad_autonoma,
            func.sum(CovidCase.casos_confirmados).label("total_casos"),
            func.sum(CovidCase.fallecidos).label("total_fallecidos"),
            func.avg(CovidCase.casos_confirmados).label("promedio_diario")
        ).group_by(CovidCase.comunidad_autonoma).all()
        
        # Totales generales
        totals = db.query(
            func.sum(CovidCase.casos_confirmados).label("total_casos"),
            func.sum(CovidCase.fallecidos).label("total_fallecidos"),
            func.sum(CovidCase.ingresos_uci).label("total_uci"),
            func.count(func.distinct(CovidCase.fecha)).label("dias_registrados")
        ).first()
        
        return {
            "por_comunidad": [
                {
                    "comunidad": r.comunidad_autonoma,
                    "total_casos": int(r.total_casos),
                    "total_fallecidos": int(r.total_fallecidos),
                    "promedio_diario": float(r.promedio_diario)
                }
                for r in total_por_comunidad
            ],
            "totales": {
                "total_casos": int(totals.total_casos) if totals.total_casos else 0,
                "total_fallecidos": int(totals.total_fallecidos) if totals.total_fallecidos else 0,
                "total_uci": int(totals.total_uci) if totals.total_uci else 0,
                "dias_registrados": totals.dias_registrados
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular estadísticas: {str(e)}")

# Análisis simple demo (mantener por ahora)
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