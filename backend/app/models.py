# backend/app/models.py
from sqlalchemy import Column, Integer, String, Date, Float, TIMESTAMP
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.database import Base

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
            "lat": None,  # Se calculará después
            "lon": None   # Se calculará después
        }