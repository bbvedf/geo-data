# /home/bbvedf/prog/geo-data/backend/app/elections.py
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import Depends

router = APIRouter(prefix="/api", tags=["elections"])

@router.get("/elections/data")
async def get_election_data(
    municipio: Optional[str] = Query(None, description="Nombre del municipio"),
    provincia: Optional[str] = Query(None, description="Nombre de la provincia"),
    comunidad: Optional[str] = Query(None, description="Nombre de la comunidad"),
    partido_ganador: Optional[str] = Query(None, description="Partido ganador"),
    min_participacion: Optional[float] = Query(None, ge=0, le=100, description="Participación mínima (%)"),
    max_participacion: Optional[float] = Query(None, ge=0, le=100, description="Participación máxima (%)"),
    limit: Optional[int] = Query(100, ge=1, le=10000, description="Límite de resultados"),
    offset: Optional[int] = Query(0, ge=0, description="Offset para paginación"),
    light: Optional[bool] = Query(False, description="Modo ligero (solo coords + partido)"),
    db: Session = Depends(get_db)
):
    """
    Obtener resultados electorales con filtros avanzados
    
    **Modo light=true**: Devuelve solo coordenadas, nombre y partido ganador (para mapas)
    **Modo light=false**: Devuelve todos los datos completos
    """
    try:
        # Query base diferente según modo light
        if light:
            query = """
                SELECT 
                    m.codigo_ine,
                    m.nombre_municipio,
                    m.nombre_provincia,
                    m.lat,
                    m.lon,
                    e.partido_ganador,
                    e.participacion,
                    m.poblacion
                FROM municipios_espana m
                JOIN elecciones_congreso_2023 e ON m.codigo_ine = e.municipio_ine
                WHERE 1=1
            """
        else:
            query = """
                SELECT 
                    m.codigo_ine,
                    m.nombre_municipio,
                    m.nombre_provincia,
                    m.nombre_comunidad,
                    m.poblacion,
                    m.lat,
                    m.lon,
                    e.num_mesas,
                    e.censo,
                    e.votantes,
                    e.votos_validos,
                    e.votos_candidaturas,
                    e.votos_blanco,
                    e.votos_nulos,
                    e.pp,
                    e.psoe,
                    e.vox,
                    e.sumar,
                    e.erc,
                    e.jxcat_junts,
                    e.eh_bildu,
                    e.eaj_pnv,
                    e.bng,
                    e.cca,
                    e.upn,
                    e.pacma,
                    e.cup_pr,
                    e.fo,
                    e.participacion,
                    e.partido_ganador,
                    e.votos_ganador,
                    e.total_votos_partidos,
                    e.created_at
                FROM municipios_espana m
                JOIN elecciones_congreso_2023 e ON m.codigo_ine = e.municipio_ine
                WHERE 1=1
            """
        
        params = {}
        
        if municipio:
            query += " AND m.nombre_municipio ILIKE :municipio"
            params['municipio'] = f"%{municipio}%"
        
        if provincia:
            query += " AND m.nombre_provincia ILIKE :provincia"
            params['provincia'] = f"%{provincia}%"
        
        if comunidad:
            query += " AND m.nombre_comunidad ILIKE :comunidad"
            params['comunidad'] = f"%{comunidad}%"
        
        if partido_ganador:
            query += " AND e.partido_ganador = :partido_ganador"
            params['partido_ganador'] = partido_ganador
        
        if min_participacion is not None:
            query += " AND e.participacion >= :min_participacion"
            params['min_participacion'] = min_participacion
        
        if max_participacion is not None:
            query += " AND e.participacion <= :max_participacion"
            params['max_participacion'] = max_participacion
        
        query += " ORDER BY m.nombre_municipio LIMIT :limit OFFSET :offset"
        params['limit'] = limit
        params['offset'] = offset
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        # Convertir según modo
        data = []
        if light:
            # Modo ligero: solo lo esencial
            for row in rows:
                data.append({
                    "codigo_ine": row[0],
                    "nombre_municipio": row[1],
                    "nombre_provincia": row[2],
                    "lat": float(row[3]) if row[3] else None,
                    "lon": float(row[4]) if row[4] else None,
                    "partido_ganador": row[5],
                    "participacion": float(row[6]) if row[6] else None,
                    "poblacion": row[7]
                })
        else:
            # Modo completo
            for row in rows:
                data.append({
                    "codigo_ine": row[0],
                    "nombre_municipio": row[1],
                    "nombre_provincia": row[2],
                    "nombre_comunidad": row[3],
                    "poblacion": row[4],
                    "lat": float(row[5]) if row[5] else None,
                    "lon": float(row[6]) if row[6] else None,
                    "num_mesas": row[7],
                    "censo": row[8],
                    "votantes": row[9],
                    "votos_validos": row[10],
                    "votos_candidaturas": row[11],
                    "votos_blanco": row[12],
                    "votos_nulos": row[13],
                    "pp": row[14],
                    "psoe": row[15],
                    "vox": row[16],
                    "sumar": row[17],
                    "erc": row[18],
                    "jxcat_junts": row[19],
                    "eh_bildu": row[20],
                    "eaj_pnv": row[21],
                    "bng": row[22],
                    "cca": row[23],
                    "upn": row[24],
                    "pacma": row[25],
                    "cup_pr": row[26],
                    "fo": row[27],
                    "participacion": float(row[28]) if row[28] else None,
                    "partido_ganador": row[29],
                    "votos_ganador": row[30],
                    "total_votos_partidos": row[31],
                    "created_at": row[32].isoformat() if row[32] else None
                })
        
        # Obtener total de registros (para paginación)
        count_query = """
            SELECT COUNT(*) 
            FROM municipios_espana m
            JOIN elecciones_congreso_2023 e ON m.codigo_ine = e.municipio_ine
            WHERE 1=1
        """
        count_params = {}
        
        if municipio:
            count_query += " AND m.nombre_municipio ILIKE :municipio"
            count_params['municipio'] = f"%{municipio}%"
        
        if provincia:
            count_query += " AND m.nombre_provincia ILIKE :provincia"
            count_params['provincia'] = f"%{provincia}%"
        
        if comunidad:
            count_query += " AND m.nombre_comunidad ILIKE :comunidad"
            count_params['comunidad'] = f"%{comunidad}%"
        
        if partido_ganador:
            count_query += " AND e.partido_ganador = :partido_ganador"
            count_params['partido_ganador'] = partido_ganador
        
        if min_participacion is not None:
            count_query += " AND e.participacion >= :min_participacion"
            count_params['min_participacion'] = min_participacion
        
        if max_participacion is not None:
            count_query += " AND e.participacion <= :max_participacion"
            count_params['max_participacion'] = max_participacion
        
        total_result = db.execute(text(count_query), count_params)
        total = total_result.scalar()
        
        return {
            "success": True,
            "count": len(data),
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": (offset + len(data)) < total,
            "light_mode": light,
            "data": data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos electorales: {str(e)}")


@router.get("/elections/municipality/{codigo_ine}")
async def get_municipality_detail(
    codigo_ine: str,
    db: Session = Depends(get_db)
):
    """
    Obtener datos completos de un municipio específico
    """
    try:
        query = """
            SELECT 
                m.codigo_ine,
                m.nombre_municipio,
                m.nombre_provincia,
                m.nombre_comunidad,
                m.poblacion,
                m.lat,
                m.lon,
                e.num_mesas,
                e.censo,
                e.votantes,
                e.votos_validos,
                e.votos_candidaturas,
                e.votos_blanco,
                e.votos_nulos,
                e.pp,
                e.psoe,
                e.vox,
                e.sumar,
                e.erc,
                e.jxcat_junts,
                e.eh_bildu,
                e.eaj_pnv,
                e.bng,
                e.cca,
                e.upn,
                e.pacma,
                e.cup_pr,
                e.fo,
                e.participacion,
                e.partido_ganador,
                e.votos_ganador,
                e.total_votos_partidos,
                e.created_at
            FROM municipios_espana m
            JOIN elecciones_congreso_2023 e ON m.codigo_ine = e.municipio_ine
            WHERE m.codigo_ine = :codigo_ine
        """
        
        result = db.execute(text(query), {"codigo_ine": codigo_ine})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Municipio {codigo_ine} no encontrado")
        
        data = {
            "codigo_ine": row[0],
            "nombre_municipio": row[1],
            "nombre_provincia": row[2],
            "nombre_comunidad": row[3],
            "poblacion": row[4],
            "lat": float(row[5]) if row[5] else None,
            "lon": float(row[6]) if row[6] else None,
            "num_mesas": row[7],
            "censo": row[8],
            "votantes": row[9],
            "votos_validos": row[10],
            "votos_candidaturas": row[11],
            "votos_blanco": row[12],
            "votos_nulos": row[13],
            "pp": row[14],
            "psoe": row[15],
            "vox": row[16],
            "sumar": row[17],
            "erc": row[18],
            "jxcat_junts": row[19],
            "eh_bildu": row[20],
            "eaj_pnv": row[21],
            "bng": row[22],
            "cca": row[23],
            "upn": row[24],
            "pacma": row[25],
            "cup_pr": row[26],
            "fo": row[27],
            "participacion": float(row[28]) if row[28] else None,
            "partido_ganador": row[29],
            "votos_ganador": row[30],
            "total_votos_partidos": row[31],
            "created_at": row[32].isoformat() if row[32] else None
        }
        
        return {
            "success": True,
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener municipio: {str(e)}")


@router.get("/elections/stats")
async def get_election_stats(db: Session = Depends(get_db)):
    """
    Estadísticas agregadas de las elecciones
    """
    try:
        # Totales nacionales
        stats_query = """
            SELECT 
                COUNT(*) as total_municipios,
                SUM(e.censo) as total_censo,
                SUM(e.votantes) as total_votantes,
                AVG(e.participacion) as participacion_media,
                SUM(e.pp) as total_pp,
                SUM(e.psoe) as total_psoe,
                SUM(e.vox) as total_vox,
                SUM(e.sumar) as total_sumar,
                SUM(e.erc) as total_erc
            FROM elecciones_congreso_2023 e
        """
        
        result = db.execute(text(stats_query))
        stats_row = result.fetchone()
        
        # Distribución de partidos ganadores
        ganadores_query = """
            SELECT 
                partido_ganador,
                COUNT(*) as municipios_ganados,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM elecciones_congreso_2023), 2) as porcentaje
            FROM elecciones_congreso_2023
            WHERE partido_ganador != 'sin_datos'
            GROUP BY partido_ganador
            ORDER BY municipios_ganados DESC
        """
        
        result = db.execute(text(ganadores_query))
        ganadores_rows = result.fetchall()
        
        ganadores_dist = [
            {
                "partido": row[0],
                "municipios_ganados": row[1],
                "porcentaje": float(row[2]) if row[2] else 0
            }
            for row in ganadores_rows
        ]
        
        return {
            "success": True,
            "stats": {
                "total_municipios": stats_row[0],
                "total_censo": int(stats_row[1]) if stats_row[1] else 0,
                "total_votantes": int(stats_row[2]) if stats_row[2] else 0,
                "participacion_media": float(stats_row[3]) if stats_row[3] else 0,
                "totales_partidos": {
                    "PP": int(stats_row[4]) if stats_row[4] else 0,
                    "PSOE": int(stats_row[5]) if stats_row[5] else 0,
                    "VOX": int(stats_row[6]) if stats_row[6] else 0,
                    "SUMAR": int(stats_row[7]) if stats_row[7] else 0,
                    "ERC": int(stats_row[8]) if stats_row[8] else 0
                }
            },
            "distribucion_ganadores": ganadores_dist
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")


@router.get("/elections/party/{partido}")
async def get_party_results(
    partido: str,
    db: Session = Depends(get_db)
):
    """
    Resultados específicos de un partido por comunidad autónoma
    """
    try:
        # Validar partido
        partidos_validos = ['pp', 'psoe', 'vox', 'sumar', 'erc', 'jxcat_junts', 
                           'eh_bildu', 'eaj_pnv', 'bng', 'cca', 'upn', 'pacma', 'cup_pr', 'fo']
        
        if partido.lower() not in partidos_validos:
            raise HTTPException(status_code=400, detail=f"Partido no válido. Válidos: {', '.join(partidos_validos)}")
        
        query = f"""
            SELECT 
                m.nombre_comunidad,
                COUNT(*) as total_municipios,
                SUM(e.{partido}) as total_votos,
                SUM(e.censo) as censo_comunidad,
                ROUND(SUM(e.{partido}) * 100.0 / NULLIF(SUM(e.votos_validos), 0), 2) as porcentaje_votos
            FROM municipios_espana m
            JOIN elecciones_congreso_2023 e ON m.codigo_ine = e.municipio_ine
            GROUP BY m.nombre_comunidad
            HAVING SUM(e.{partido}) > 0
            ORDER BY total_votos DESC
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        data = []
        for row in rows:
            data.append({
                "comunidad": row[0],
                "total_municipios": row[1],
                "total_votos": int(row[2]) if row[2] else 0,
                "censo_comunidad": int(row[3]) if row[3] else 0,
                "porcentaje_votos": float(row[4]) if row[4] else 0
            })
        
        return {
            "success": True,
            "partido": partido.upper(),
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos del partido: {str(e)}")