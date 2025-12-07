# backend/app/routers/covid.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Date, TIMESTAMP, text
from sqlalchemy.sql import func
from typing import Optional
from datetime import date
import json
from geoalchemy2 import Geometry
from app.database import get_db, Base

# MODELO COVID
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

# ROUTER
router = APIRouter(prefix="/api", tags=["covid"])

@router.get("/covid/data")
async def get_covid_data(
    comunidad: Optional[str] = Query(None, description="Comunidad autónoma"),
    provincia: Optional[str] = Query(None, description="Provincia"),
    fecha_inicio: Optional[date] = Query(None, description="Fecha inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha fin"),
    min_casos: Optional[int] = Query(None, ge=0, description="Casos mínimos"),
    max_casos: Optional[int] = Query(None, ge=0, description="Casos máximos"),
    limit: Optional[int] = Query(100, ge=1, le=10000, description="Límite de resultados"),
    offset: Optional[int] = Query(0, ge=0, description="Offset para paginación"),
    light: Optional[bool] = Query(False, description="Modo ligero (solo coords + casos)"),
    db: Session = Depends(get_db)
):
    """
    Obtener datos COVID con filtros
    
    **Modo light=true**: Solo coordenadas, comunidad, casos, fecha (para mapas)
    **Modo light=false**: Todos los datos completos
    """
    try:
        # Query base según modo
        if light:
            # Modo ligero - optimizado con ST_AsGeoJSON
            query = """
                SELECT 
                    id,
                    fecha,
                    comunidad_autonoma,
                    provincia,
                    casos_confirmados,
                    ST_X(geom::geometry) as lon,
                    ST_Y(geom::geometry) as lat
                FROM covid_cases
                WHERE 1=1
            """
        else:
            # Modo completo
            query = """
                SELECT 
                    id,
                    fecha,
                    comunidad_autonoma,
                    provincia,
                    casos_confirmados,
                    ingresos_uci,
                    fallecidos,
                    altas,
                    ST_X(geom::geometry) as lon,
                    ST_Y(geom::geometry) as lat
                FROM covid_cases
                WHERE 1=1
            """
        
        params = {}
        
        # Aplicar filtros
        if comunidad and comunidad != "todas":
            query += " AND comunidad_autonoma ILIKE :comunidad"
            params['comunidad'] = f"%{comunidad}%"
        
        if provincia and provincia != "todas":
            query += " AND provincia ILIKE :provincia"
            params['provincia'] = f"%{provincia}%"
        
        if fecha_inicio:
            query += " AND fecha >= :fecha_inicio"
            params['fecha_inicio'] = fecha_inicio
        
        if fecha_fin:
            query += " AND fecha <= :fecha_fin"
            params['fecha_fin'] = fecha_fin
        
        if min_casos is not None:
            query += " AND casos_confirmados >= :min_casos"
            params['min_casos'] = min_casos
        
        if max_casos is not None:
            query += " AND casos_confirmados <= :max_casos"
            params['max_casos'] = max_casos
        
        query += " ORDER BY fecha, comunidad_autonoma LIMIT :limit OFFSET :offset"
        params['limit'] = limit
        params['offset'] = offset
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        # Convertir según modo
        data = []
        if light:
            for row in rows:
                data.append({
                    "id": row[0],
                    "fecha": str(row[1]),
                    "comunidad": row[2],
                    "provincia": row[3],
                    "casos": row[4],
                    "lon": float(row[5]) if row[5] else None,
                    "lat": float(row[6]) if row[6] else None
                })
        else:
            for row in rows:
                data.append({
                    "id": row[0],
                    "fecha": str(row[1]),
                    "comunidad": row[2],
                    "provincia": row[3],
                    "casos": row[4],
                    "ingresos_uci": row[5],
                    "fallecidos": row[6],
                    "altas": row[7],
                    "lon": float(row[8]) if row[8] else None,
                    "lat": float(row[9]) if row[9] else None
                })
        
        # Obtener total para paginación
        count_query = "SELECT COUNT(*) FROM covid_cases WHERE 1=1"
        count_params = {}
        
        if comunidad and comunidad != "todas":
            count_query += " AND comunidad_autonoma ILIKE :comunidad"
            count_params['comunidad'] = f"%{comunidad}%"
        
        if provincia and provincia != "todas":
            count_query += " AND provincia ILIKE :provincia"
            count_params['provincia'] = f"%{provincia}%"
        
        if fecha_inicio:
            count_query += " AND fecha >= :fecha_inicio"
            count_params['fecha_inicio'] = fecha_inicio
        
        if fecha_fin:
            count_query += " AND fecha <= :fecha_fin"
            count_params['fecha_fin'] = fecha_fin
        
        if min_casos is not None:
            count_query += " AND casos_confirmados >= :min_casos"
            count_params['min_casos'] = min_casos
        
        if max_casos is not None:
            count_query += " AND casos_confirmados <= :max_casos"
            count_params['max_casos'] = max_casos
        
        total_result = db.execute(text(count_query), count_params)
        total = total_result.scalar()
        
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": (offset + len(data)) < total,
            "light_mode": light
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos: {str(e)}")


@router.get("/covid/case/{case_id}")
async def get_covid_case_detail(
    case_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener datos completos de un caso COVID específico
    """
    try:
        query = """
            SELECT 
                id,
                fecha,
                comunidad_autonoma,
                provincia,
                casos_confirmados,
                ingresos_uci,
                fallecidos,
                altas,
                ST_X(geom::geometry) as lon,
                ST_Y(geom::geometry) as lat,
                created_at
            FROM covid_cases
            WHERE id = :case_id
        """
        
        result = db.execute(text(query), {"case_id": case_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Caso {case_id} no encontrado")
        
        data = {
            "id": row[0],
            "fecha": str(row[1]),
            "comunidad": row[2],
            "provincia": row[3],
            "casos": row[4],
            "ingresos_uci": row[5],
            "fallecidos": row[6],
            "altas": row[7],
            "lon": float(row[8]) if row[8] else None,
            "lat": float(row[9]) if row[9] else None,
            "created_at": row[10].isoformat() if row[10] else None
        }
        
        return {
            "success": True,
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener caso: {str(e)}")


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
    """
    Filtrar datos COVID (legacy endpoint - redirige a /covid/data)
    Mantenido por compatibilidad
    """
    # Redirigir al nuevo endpoint optimizado
    return await get_covid_data(
        comunidad=comunidad,
        provincia=provincia,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        min_casos=min_casos,
        max_casos=max_casos,
        limit=10000,
        offset=0,
        light=False,
        db=db
    )