# backend/app/routers/covid.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Date, TIMESTAMP
from sqlalchemy.sql import func
from typing import Optional
from datetime import date
import json
from geoalchemy2 import Geometry
from app.database import get_db, Base

# MODELO COVID DENTRO DEL MISMO ARCHIVO
class CovidCase(Base):
    __tablename__ = "covid_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    comunidad_autonoma = Column(String(100), nullable=False, index=True)
    provincia = Column(String(100))
    casos_confirmados = Column(Integer, nullable=False)
    ingresos_uci = Column(Integer)
    fallecidos = Column(Integer)
    altas = Column(Integer)
    geom = Column(Geometry('POINT', srid=4326), index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "fecha": str(self.fecha),
            "comunidad": self.comunidad_autonoma,
            "provincia": self.provincia,
            "casos": self.casos_confirmados,
            "ingresos_uci": self.ingresos_uci,
            "fallecidos": self.fallecidos,
            "altas": self.altas,
            "lat": None,
            "lon": None
        }

# ROUTER
router = APIRouter(prefix="/api", tags=["covid"])

# ENDPOINTS (exactamente igual que antes)
@router.get("/covid/data")
async def get_covid_data(db: Session = Depends(get_db)):
    """Obtener todos los datos COVID"""
    try:
        cases = db.query(CovidCase).order_by(CovidCase.fecha, CovidCase.comunidad_autonoma).all()
        
        result = []
        for case in cases:
            point_data = db.scalar(case.geom.ST_AsGeoJSON())
            if point_data:
                coords = json.loads(point_data)["coordinates"]
                lon, lat = coords[0], coords[1]
            else:
                lat, lon = None, None
            
            result.append({
                "fecha": str(case.fecha),
                "comunidad": case.comunidad_autonoma,
                "provincia": case.provincia,
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

@router.get("/covid/stats")
async def get_covid_stats(db: Session = Depends(get_db)):
    """Estadísticas agregadas de COVID"""
    try:
        total_por_comunidad = db.query(
            CovidCase.comunidad_autonoma,
            func.sum(CovidCase.casos_confirmados).label("total_casos"),
            func.sum(CovidCase.fallecidos).label("total_fallecidos"),
            func.avg(CovidCase.casos_confirmados).label("promedio_diario")
        ).group_by(CovidCase.comunidad_autonoma).all()
        
        total_por_provincia = db.query(
            CovidCase.provincia,
            CovidCase.comunidad_autonoma,
            func.sum(CovidCase.casos_confirmados).label("total_casos"),
            func.sum(CovidCase.fallecidos).label("total_fallecidos")
        ).group_by(CovidCase.provincia, CovidCase.comunidad_autonoma).all()

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
            "por_provincia": [
                {
                    "provincia": r.provincia,
                    "comunidad": r.comunidad_autonoma,
                    "total_casos": int(r.total_casos),
                    "total_fallecidos": int(r.total_fallecidos)
                }
                for r in total_por_provincia
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

@router.get("/covid/filter")
async def filter_covid_data(
    db: Session = Depends(get_db),
    comunidad: Optional[str] = None,
    provincia: Optional[str] = None,
    fecha_inicio: Optional[date] = None,    
    fecha_fin: Optional[date] = None,
    min_casos: Optional[int] = Query(None, ge=0),
    max_casos: Optional[int] = Query(None, ge=0)
):
    """Filtrar datos COVID con múltiples parámetros"""
    try:
        query = db.query(CovidCase)
        
        if comunidad and comunidad != "todas":
            query = query.filter(CovidCase.comunidad_autonoma.ilike(f"%{comunidad}%"))
        
        if provincia and provincia != "todas":
            query = query.filter(CovidCase.provincia.ilike(f"%{provincia}%"))

        if fecha_inicio:
            query = query.filter(CovidCase.fecha >= fecha_inicio)
        if fecha_fin:
            query = query.filter(CovidCase.fecha <= fecha_fin)
        
        if min_casos:
            query = query.filter(CovidCase.casos_confirmados >= min_casos)
        if max_casos:
            query = query.filter(CovidCase.casos_confirmados <= max_casos)
        
        cases = query.order_by(CovidCase.fecha, CovidCase.comunidad_autonoma).all()
        
        result = []
        for case in cases:
            point_data = db.scalar(case.geom.ST_AsGeoJSON())
            if point_data:
                coords = json.loads(point_data)["coordinates"]
                lon, lat = coords[0], coords[1]
            else:
                lat, lon = None, None
            
            result.append({
                "fecha": str(case.fecha),
                "comunidad": case.comunidad_autonoma,
                "provincia": case.provincia,
                "casos": case.casos_confirmados,
                "ingresos_uci": case.ingresos_uci,
                "fallecidos": case.fallecidos,
                "altas": case.altas,
                "lat": lat,
                "lon": lon
            })
        
        return {
            "data": result,
            "filters_applied": {
                "comunidad": comunidad,
                "fecha_inicio": str(fecha_inicio) if fecha_inicio else None,
                "fecha_fin": str(fecha_fin) if fecha_fin else None,
                "min_casos": min_casos,
                "max_casos": max_casos
            },
            "count": len(result),
            "total_casos": sum(c.casos_confirmados for c in cases) if cases else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al filtrar datos: {str(e)}")