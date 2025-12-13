"""
Módulo para datos de Vivienda - INE (Índice de Precios de Vivienda)
URLs: https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/25171.csv?nocab=1
"""
import requests
import pandas as pd
from io import StringIO
from typing import List, Dict, Optional
from datetime import datetime, date
import json
import unicodedata
import re
from fastapi import APIRouter, Query, HTTPException, Depends
## Acceso a bd.
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.housing import HousingINECache, HousingINESnapshot  
from app.services.housing_cache import HousingCacheService

# ============= FUNCIONES DE LIMPIEZA =============
def limpiar_string(s: str) -> str:
    """Limpia espacios extra de un string"""
    if not isinstance(s, str):
        return s
    return s.strip()

# Mapeos de API
API_METRICA_MAP = {
    'indice': 'Índice',
    'var_trimestral': 'Variación trimestral',
    'var_anual': 'Variación anual',
    'var_ytd': 'Variación en lo que va de año'
}

API_TIPO_MAP = {
    'general': 'General',
    'nueva': 'Vivienda nueva',
    'segunda_mano': 'Vivienda segunda mano'
}

router = APIRouter(prefix="/api", tags=["housing"])

INE_DATA_URLS = {
    'csv': 'https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/25171.csv?nocab=1',
}

TIPO_VIVIENDA = {
    'General': 'Índice general de precios de vivienda',
    'Vivienda nueva': 'Vivienda de nueva construcción',
    'Vivienda segunda mano': 'Vivienda de segunda mano'
}

METRICAS = {
    'Índice': 'Índice base 2015=100',
    'Variación trimestral': 'Variación porcentual respecto al trimestre anterior',
    'Variación anual': 'Variación porcentual respecto al mismo trimestre del año anterior',
    'Variación en lo que va de año': 'Variación porcentual acumulada en el año'
}

CCAA_CODES = {
    '01': 'Andalucía',
    '02': 'Aragón',
    '03': 'Asturias, Principado de',
    '04': 'Balears, Illes',
    '05': 'Canarias',
    '06': 'Cantabria',
    '07': 'Castilla y León',
    '08': 'Castilla - La Mancha',
    '09': 'Cataluña',
    '10': 'Comunitat Valenciana',
    '11': 'Extremadura',
    '12': 'Galicia',
    '13': 'Madrid, Comunidad de',
    '14': 'Murcia, Región de',
    '15': 'Navarra, Comunidad Foral de',
    '16': 'País Vasco',
    '17': 'Rioja, La',
    '18': 'Ceuta',
    '19': 'Melilla'
}

INE_DATA_CACHE = None
INE_DATA_LAST_UPDATE = None

def descargar_datos_ine() -> pd.DataFrame:
    """Descarga y parsea datos del INE"""
    global INE_DATA_CACHE, INE_DATA_LAST_UPDATE
    
    if (INE_DATA_CACHE is not None and INE_DATA_LAST_UPDATE == date.today()):
        print("Usando datos INE en cache")
        return INE_DATA_CACHE
    
    try:
        url = INE_DATA_URLS['csv']
        print(f"Descargando datos INE: {url}")
        
        response = requests.get(url, verify=False, timeout=30)
        
        # Probar diferentes encodings
        text = None
        for enc in ['utf-8-sig', 'utf-8', 'ISO-8859-15', 'latin-1']:
            try:
                text = response.content.decode(enc)
                if 'ndice' in text:
                    print(f"Encoding: {enc}")
                    break
            except Exception:
                continue
        
        if text is None:
            text = response.content.decode('utf-8', errors='replace')
        
        # Parsear CSV
        df = pd.read_csv(
            StringIO(text),
            sep=';',
            decimal=',',
            dtype={'Total': str}
        )
        
        # Renombrar columnas
        df.columns = [
            'nivel_nacional',
            'ccaa',
            'tipo_vivienda',
            'metrica',
            'periodo',
            'valor_str'
        ]
        
        # Parsear valor
        def parse_valor(val):
            if pd.isna(val):
                return None
            val_str = str(val).replace(',', '.')
            try:
                return float(val_str)
            except Exception:
                return None
        
        df['valor'] = df['valor_str'].apply(parse_valor)
        df.drop('valor_str', axis=1, inplace=True)
        
        # Parsear periodo
        df['anio'] = df['periodo'].str[:4].astype(int)
        df['trimestre'] = df['periodo'].str[-1].astype(int)
        
        # Parsear CCAA
        def parse_ccaa(ccaa_str):
            if pd.isna(ccaa_str) or ccaa_str == '':
                return {'codigo': '00', 'nombre': 'Nacional'}
            
            match = re.match(r'^(\d+)\s+(.+)$', str(ccaa_str))
            if match:
                codigo = match.group(1)
                nombre = limpiar_string(match.group(2))
                return {'codigo': codigo, 'nombre': nombre}
            
            return {'codigo': None, 'nombre': limpiar_string(str(ccaa_str))}
        
        ccaa_info = df['ccaa'].apply(parse_ccaa)
        df['ccaa_codigo'] = ccaa_info.apply(lambda x: x['codigo'])
        df['ccaa_nombre'] = ccaa_info.apply(lambda x: x['nombre'])
        
        # Limpiar strings
        df['tipo_vivienda'] = df['tipo_vivienda'].apply(limpiar_string)
        df['metrica'] = df['metrica'].apply(limpiar_string)
        
        print(f"OK: {len(df)} registros")
        print(f"Tipos: {df['tipo_vivienda'].unique()}")
        print(f"Metricas: {df['metrica'].unique()}")
        
        INE_DATA_CACHE = df
        INE_DATA_LAST_UPDATE = date.today()
        
        return df
        
    except Exception as e:
        print(f"Error: {e}")
        return crear_datos_mock()

def crear_datos_mock() -> pd.DataFrame:
    """Datos mock para desarrollo"""
    print("Generando datos mock")
    
    data = []
    for anio in range(2020, 2026):
        for trimestre in [1, 2, 3, 4]:
            for tipo in ['General', 'Vivienda nueva', 'Vivienda segunda mano']:
                for metrica in ['Índice', 'Variación trimestral']:
                    for ccaa_cod in ['00', '13']:
                        valor = 100 + (anio - 2020) * 5 + trimestre
                        data.append({
                            'nivel_nacional': 'Nacional',
                            'ccaa': f"{ccaa_cod} {'Nacional' if ccaa_cod == '00' else 'Madrid'}",
                            'tipo_vivienda': tipo,
                            'metrica': metrica,
                            'periodo': f"{anio}T{trimestre}",
                            'valor': valor,
                            'anio': anio,
                            'trimestre': trimestre,
                            'ccaa_codigo': ccaa_cod,
                            'ccaa_nombre': 'Nacional' if ccaa_cod == '00' else 'Madrid'
                        })
    
    return pd.DataFrame(data)

@router.get("/housing/data")
async def get_housing_data(
    metric: str = Query('indice'),
    housing_type: str = Query('general'),
    ccaa: Optional[str] = Query(None),
    anio_desde: Optional[int] = Query(None),
    anio_hasta: Optional[int] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    debug: bool = Query(False),
    db: Session = Depends(get_db)  # ← AÑADE ESTO
):
    """Obtiene datos de precios de vivienda (con caché en Postgres)"""
    try:
        metrica_real = API_METRICA_MAP.get(metric.lower())
        tipo_real = API_TIPO_MAP.get(housing_type.lower())
        
        if not metrica_real or not tipo_real:
            raise HTTPException(status_code=400, detail="Parametros invalidos")
        
        # ========== INTENTAR OBTENER DEL CACHÉ ==========
        cache_service = HousingCacheService()
        
        if cache_service.is_cache_valid(db):
            # Caché válido: usar datos de Postgres
            print(f"📦 Usando datos del caché para {metric} - {housing_type}")
            cached_results = cache_service.get_from_cache(
                db=db,
                metric=metrica_real,
                tipo_vivienda=tipo_real,
                ccaa=ccaa,
                anio_desde=anio_desde,
                anio_hasta=anio_hasta
            )
            
            # Convertir resultados de SQLAlchemy a diccionarios
            filtered = cached_results
            total = len(filtered)
            
            resultados = []
            for item in filtered[offset:offset+limit]:
                resultados.append({
                    'periodo': item.periodo,
                    'anio': item.anio,
                    'trimestre': item.trimestre,
                    'ccaa_codigo': item.ccaa_codigo,
                    'ccaa_nombre': item.ccaa_nombre,
                    'tipo_vivienda': item.tipo_vivienda,
                    'metrica': item.metrica,
                    'valor': item.valor
                })
            
            return {
                "success": True,
                "count": len(resultados),
                "total": total,
                "offset": offset,
                "limit": limit,
                "data": resultados,
                "source": "cache"  # ← Indicador de que viene del caché
            }
        
        # ========== CACHÉ INVÁLIDO O VACÍO: DESCARGAR DEL INE ==========
        print(f"🌐 Caché inválido/vacío: descargando del INE...")
        df = descargar_datos_ine()
        
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Datos no disponibles")
        
        # Guardar en caché para futuras requests
        print("🔍 DEBUG: Intentando guardar en caché...")
        try:
            print(f"🔍 DEBUG: df tiene {len(df)} registros")
            print(f"🔍 DEBUG: Llamando a save_to_cache...")
            result = cache_service.save_to_cache(db, df)
            print(f"🔍 DEBUG: save_to_cache retornó {result}")
        except Exception as e:
            import traceback
            print(f"⚠️ No se pudo guardar en caché: {e}")
            print(f"⚠️ Traceback: {traceback.format_exc()}")
            # Continuar igualmente, el caché es opcional
        
        # Filtrar como antes
        if debug:
            print(f"DEBUG: Buscando metrica='{metrica_real}', tipo='{tipo_real}'")
            print(f"DEBUG: Metricas unicas: {df['metrica'].unique()}")
            print(f"DEBUG: Tipos unicos: {df['tipo_vivienda'].unique()}")
        
        filtered = df[
            (df['metrica'] == metrica_real) &
            (df['tipo_vivienda'] == tipo_real)
        ]
        
        if debug:
            print(f"DEBUG: Coincidencias: {len(filtered)}")
        
        if ccaa:
            filtered = filtered[filtered['ccaa_codigo'] == ccaa]
        
        if anio_desde:
            filtered = filtered[filtered['anio'] >= anio_desde]
        if anio_hasta:
            filtered = filtered[filtered['anio'] <= anio_hasta]
        
        total = len(filtered)
        
        filtered = filtered.sort_values(['anio', 'trimestre'], ascending=[False, False])
        paginated = filtered.iloc[offset:offset+limit] if offset < total else pd.DataFrame()
        
        resultados = []
        for _, row in paginated.iterrows():
            resultados.append({
                'periodo': row['periodo'],
                'anio': int(row['anio']),
                'trimestre': int(row['trimestre']),
                'ccaa_codigo': row['ccaa_codigo'] if pd.notna(row['ccaa_codigo']) else '00',
                'ccaa_nombre': row['ccaa_nombre'] if pd.notna(row['ccaa_nombre']) else 'Nacional',
                'tipo_vivienda': row['tipo_vivienda'],
                'metrica': row['metrica'],
                'valor': float(row['valor']) if pd.notna(row['valor']) else None
            })
        
        return {
            "success": True,
            "count": len(resultados),
            "total": total,
            "offset": offset,
            "limit": limit,
            "data": resultados,
            "source": "ine"  # ← Indicador de que viene del INE
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/housing/metadata")
async def get_housing_metadata():
    """Metadatos del dataset"""
    try:
        df = descargar_datos_ine()
        
        if df is None or df.empty:
            return {
                "dataset_name": "Índice de Precios de Vivienda (INE)",
                "source": "Instituto Nacional de Estadística (INE)",
                "data_available": False
            }
        
        return {
            "dataset_name": "Índice de Precios de Vivienda (INE)",
            "source": "Instituto Nacional de Estadística (INE)",
            "data_available": True,
            "total_records": len(df),
            "periodo_min": f"{df['anio'].min()}T{df[df['anio'] == df['anio'].min()]['trimestre'].min()}",
            "periodo_max": f"{df['anio'].max()}T{df[df['anio'] == df['anio'].max()]['trimestre'].max()}",
            "tipos_vivienda": list(df['tipo_vivienda'].unique()),
            "metricas": list(df['metrica'].unique()),
            "ccaa_count": df['ccaa_nombre'].nunique()
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/housing/health")
async def health_check():
    """Health check"""
    try:
        df = descargar_datos_ine()
        
        if df is not None and len(df) > 0:
            return {
                "status": "healthy",
                "records": len(df),
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "degraded",
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }