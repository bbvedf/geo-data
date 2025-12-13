# backend/app/services/housing_cache.py
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from app.models.housing import HousingINECache, HousingINESnapshot
import pandas as pd

CACHE_TTL_HOURS = 24  # Tiempo de vida del caché en horas

class HousingCacheService:
    """Servicio para gestionar el caché de datos del INE con snapshots históricos"""
    
    @staticmethod
    def is_cache_valid(db: Session) -> bool:
        """Comprueba si el caché tiene datos frescos (menos de 24h)"""
        try:
            latest = db.query(HousingINECache).order_by(
                HousingINECache.cached_at.desc()
            ).first()
            
            if not latest:
                return False
            
            age = datetime.utcnow() - latest.cached_at
            is_valid = age < timedelta(hours=CACHE_TTL_HOURS)
            
            if is_valid:
                count = db.query(HousingINECache).count()
                print(f"✅ Caché válido: {count} registros (actualizado hace {age.total_seconds()/3600:.1f}h)")
            else:
                print(f"⏳ Caché expirado (última actualización hace {age.total_seconds()/3600:.1f}h)")
            
            return is_valid
        except Exception as e:
            print(f"⚠️ Error verificando caché: {e}")
            return False
    
    @staticmethod
    def save_to_cache(db: Session, df: pd.DataFrame) -> int:
        """Guarda datos en el caché y crea snapshot histórico"""
        try:
            # ========== PASO 1: CREAR SNAPSHOT DEL CACHÉ ANTERIOR ==========
            print("🔍 DEBUG: Entrando en save_to_cache...")
            current_cache = db.query(HousingINECache).all()
            print(f"🔍 DEBUG: current_cache tiene {len(current_cache)} registros")
            
            if current_cache:
                print(f"📸 Creando snapshot histórico de {len(current_cache)} registros...")
                for item in current_cache:
                    snapshot = HousingINESnapshot(
                        periodo=item.periodo,
                        anio=item.anio,
                        trimestre=item.trimestre,
                        ccaa_codigo=item.ccaa_codigo,
                        ccaa_nombre=item.ccaa_nombre,
                        tipo_vivienda=item.tipo_vivienda,
                        metrica=item.metrica,
                        valor=item.valor,
                        snapshot_date=datetime.utcnow()
                    )
                    db.add(snapshot)
                db.commit()
                print(f"✅ Snapshot histórico creado")
            else:
                print("🔍 DEBUG: No hay registros en caché anterior, saltando snapshot")
            
            # ========== PASO 2: LIMPIAR CACHÉ ANTERIOR ==========
            db.query(HousingINECache).delete()
            db.commit()
            print(f"🗑️ Caché anterior eliminado")
            
            # ========== PASO 3: GUARDAR NUEVOS DATOS EN CACHÉ ==========
            count = 0
            for _, row in df.iterrows():
                cache_entry = HousingINECache(
                    periodo=row['periodo'],
                    anio=int(row['anio']),
                    trimestre=int(row['trimestre']),
                    ccaa_codigo=row['ccaa_codigo'] if pd.notna(row['ccaa_codigo']) else '00',
                    ccaa_nombre=row['ccaa_nombre'] if pd.notna(row['ccaa_nombre']) else 'Nacional',
                    tipo_vivienda=row['tipo_vivienda'],
                    metrica=row['metrica'],
                    valor=float(row['valor']) if pd.notna(row['valor']) else None,
                )
                db.add(cache_entry)
                count += 1
            
            db.commit()
            print(f"💾 {count} registros guardados en caché")
            return count
        except Exception as e:
            db.rollback()
            print(f"❌ Error guardando en caché: {e}")
            raise
    
    @staticmethod
    def get_from_cache(
        db: Session,
        metric: str,
        tipo_vivienda: str,
        ccaa: str = None,
        anio_desde: int = None,
        anio_hasta: int = None
    ) -> list:
        """Obtiene datos del caché actual con filtros opcionales"""
        try:
            query = db.query(HousingINECache).filter(
                and_(
                    HousingINECache.metrica == metric,
                    HousingINECache.tipo_vivienda == tipo_vivienda
                )
            )
            
            if ccaa and ccaa != '00':
                query = query.filter(HousingINECache.ccaa_codigo == ccaa)
            elif ccaa == '00':
                query = query.filter(HousingINECache.ccaa_codigo == '00')
            
            if anio_desde:
                query = query.filter(HousingINECache.anio >= anio_desde)
            
            if anio_hasta:
                query = query.filter(HousingINECache.anio <= anio_hasta)
            
            results = query.order_by(
                HousingINECache.anio.desc(),
                HousingINECache.trimestre.desc()
            ).all()
            
            return results
        except Exception as e:
            print(f"❌ Error obteniendo datos del caché: {e}")
            return []
    
    @staticmethod
    def get_from_snapshots(
        db: Session,
        metric: str,
        tipo_vivienda: str,
        ccaa: str = None,
        snapshot_date: datetime = None
    ) -> list:
        """Obtiene datos históricos de snapshots (para comparativas)"""
        try:
            query = db.query(HousingINESnapshot).filter(
                and_(
                    HousingINESnapshot.metrica == metric,
                    HousingINESnapshot.tipo_vivienda == tipo_vivienda
                )
            )
            
            if ccaa and ccaa != '00':
                query = query.filter(HousingINESnapshot.ccaa_codigo == ccaa)
            elif ccaa == '00':
                query = query.filter(HousingINESnapshot.ccaa_codigo == '00')
            
            if snapshot_date:
                # Obtener snapshot más cercano a esa fecha
                query = query.filter(HousingINESnapshot.snapshot_date <= snapshot_date)
            
            results = query.order_by(
                HousingINESnapshot.snapshot_date.desc(),
                HousingINESnapshot.anio.desc(),
                HousingINESnapshot.trimestre.desc()
            ).all()
            
            return results
        except Exception as e:
            print(f"❌ Error obteniendo datos de snapshots: {e}")
            return []
    
    @staticmethod
    def clear_cache(db: Session) -> bool:
        """Limpia el caché actual (no toca los snapshots históricos)"""
        try:
            count = db.query(HousingINECache).delete()
            db.commit()
            print(f"🗑️ Caché limpiado: {count} registros eliminados")
            return True
        except Exception as e:
            db.rollback()
            print(f"❌ Error limpiando caché: {e}")
            return False
    
    @staticmethod
    def get_snapshot_dates(db: Session) -> list:
        """Obtiene todas las fechas de snapshot disponibles"""
        try:
            dates = db.query(HousingINESnapshot.snapshot_date).distinct().order_by(
                HousingINESnapshot.snapshot_date.desc()
            ).all()
            return [d[0] for d in dates]
        except Exception as e:
            print(f"❌ Error obteniendo fechas de snapshots: {e}")
            return []