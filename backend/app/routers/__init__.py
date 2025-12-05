# backend/app/routers/__init__.py
from .covid import router as covid_router
from .weather import router as weather_router
from .elections import router as elections_router

__all__ = ["covid_router", "weather_router", "elections_router"]