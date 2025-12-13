# backend/app/models/housing.py
from sqlalchemy import Column, Integer, String, Float, DateTime, UniqueConstraint, Index
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base

class HousingINECache(Base):
    """Caché actual de datos del INE - Índice de Precios de Vivienda"""
    
    __tablename__ = "housing_ine_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(10), nullable=False)
    anio = Column(Integer, nullable=False)
    trimestre = Column(Integer, nullable=False)
    ccaa_codigo = Column(String(5), nullable=False)
    ccaa_nombre = Column(String(100), nullable=False)
    tipo_vivienda = Column(String(100), nullable=False)
    metrica = Column(String(100), nullable=False)
    valor = Column(Float, nullable=True)
    cached_at = Column(DateTime, server_default=func.now(), default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('periodo', 'ccaa_codigo', 'tipo_vivienda', 'metrica', 
                        name='uq_housing_cache'),
        Index('idx_housing_periodo', 'periodo'),
        Index('idx_housing_ccaa', 'ccaa_codigo'),
        Index('idx_housing_tipo', 'tipo_vivienda'),
        Index('idx_housing_metrica', 'metrica'),
    )
    
    class Config:
        from_attributes = True
    
    def __repr__(self):
        return f"<HousingINECache({self.periodo}, {self.ccaa_codigo}, {self.tipo_vivienda})>"


class HousingINESnapshot(Base):
    """Snapshots históricos de datos del INE - Índice de Precios de Vivienda"""
    
    __tablename__ = "housing_ine_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(10), nullable=False)
    anio = Column(Integer, nullable=False)
    trimestre = Column(Integer, nullable=False)
    ccaa_codigo = Column(String(5), nullable=False)
    ccaa_nombre = Column(String(100), nullable=False)
    tipo_vivienda = Column(String(100), nullable=False)
    metrica = Column(String(100), nullable=False)
    valor = Column(Float, nullable=True)
    snapshot_date = Column(DateTime, server_default=func.now(), default=datetime.utcnow)
    
    __table_args__ = (
        # No unique constraint aquí: queremos múltiples snapshots de la misma combinación
        Index('idx_snapshot_periodo', 'periodo'),
        Index('idx_snapshot_ccaa', 'ccaa_codigo'),
        Index('idx_snapshot_tipo', 'tipo_vivienda'),
        Index('idx_snapshot_metrica', 'metrica'),
        Index('idx_snapshot_date', 'snapshot_date'),
    )
    
    class Config:
        from_attributes = True
    
    def __repr__(self):
        return f"<HousingINESnapshot({self.periodo}, {self.ccaa_codigo}, {self.snapshot_date})>"