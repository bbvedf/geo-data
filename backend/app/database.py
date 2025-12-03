# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Usa la variable DATABASE_URL del entorno (ya está en docker-compose)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://geodata:geodata_prod_password@localhost:5432/geodata")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency para FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()